import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface AssetRow {
  ID_Activo: string;
  Clase: string;
  Categoría: string;
  Subcategoría: string;
  Institución: string;
  Nombre_Producto: string;
  Ticker: string;
  Identificador_Cuenta: string;
}

interface HistoryRow {
  ID_Activo: string;
  Fecha: string;
  Clase: string;
  Categoría: string;
  Subcategoría: string;
  Institución: string;
  Nombre_Producto: string;
  Moneda: string;
  Valor_Original: string;
  Tipo_Cambio_a_CLP: string;
  Valor_CLP: string;
  Ticker: string;
  Identificador_Cuenta: string;
  Detalle_Adicional: string;
}

async function readCsv<T>(filePath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

function parseDate(dateStr: string): string {
  // Expected format: DD/MM/YYYY or D/M/YYYY
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

async function run() {
  console.log('🚀 Iniciando migración...');

  // 1. Obtener usuario_id
  const { data: activosData, error: activosError } = await supabase.from('activos').select('usuario_id').limit(1);
  if (activosError || !activosData || activosData.length === 0) {
    console.error('❌ No se encontró un usuario_id en la tabla activos. Asegúrate de que el seed haya corrido.');
    return;
  }
  const usuarioId = activosData[0].usuario_id;
  console.log(`👤 Usando usuario_id: ${usuarioId}`);

  // 2. Leer archivos CSV
  const catalogo = await readCsv<AssetRow>('Balance_Master_2026 - Catalogo_Activos.csv');
  const historico = await readCsv<HistoryRow>('Balance_Master_2026 - Historico.csv');

  console.log(`📄 Leídas ${catalogo.length} filas del catálogo.`);
  console.log(`📄 Leídas ${historico.length} filas del histórico.`);

  // 3. Upsert de Catálogo
  const assetsMap = new Map<string, string>(); // ID_Activo -> UUID

  // Primero, cargar activos existentes para evitar duplicados si es posible
  const { data: existingAssets } = await supabase.from('activos').select('id, nombre_producto, institucion');
  const existingMap = new Map<string, string>();
  existingAssets?.forEach(a => {
    existingMap.set(`${a.institucion}|${a.nombre_producto}`, a.id);
  });

  const uniqueAssets = new Map<string, any>();

  // Procesar catálogo
  for (const row of catalogo) {
    const key = row.ID_Activo;
    uniqueAssets.set(key, {
      clase: row.Clase === 'Activo' ? 'Activo' : (row.Clase || 'Activo'), // Podría ser Pasivo
      categoria: row.Categoría,
      subcategoria: row.Subcategoría,
      institucion: row.Institución || '(N/A)',
      nombre_producto: row.Nombre_Producto,
      ticker: row.Ticker,
      moneda_base: 'CLP' // Default
    });
  }

  // Procesar histórico para encontrar activos faltantes
  for (let row of historico) {
    let idActivo = row.ID_Activo;
    let nombre = row.Nombre_Producto;
    let institucion = row.Institución;

    // Regla: Fallback de Columnas Invertidas
    if (idActivo && idActivo.includes(' ')) {
      // Si ID_Activo tiene espacios, probablemente es el nombre/descripción
      const temp = idActivo;
      idActivo = nombre; // Asumimos que el ID está en Nombre_Producto o similar
      nombre = temp;
      console.log(`⚠️ Columna invertida detectada para: ${temp}. Intercambiando con ${idActivo}`);
    }

    if (idActivo && !uniqueAssets.has(idActivo)) {
      uniqueAssets.set(idActivo, {
        clase: row.Clase || 'Activo',
        categoria: row.Categoría || 'Otros',
        subcategoria: row.Subcategoría,
        institucion: institucion || '(N/A)',
        nombre_producto: nombre || idActivo,
        ticker: row.Ticker,
        moneda_base: row.Moneda || 'CLP'
      });
    }
  }

  console.log(`🔍 Total de activos únicos a procesar: ${uniqueAssets.size}`);

  for (const [idExterno, asset] of uniqueAssets) {
    const key = `${asset.institucion}|${asset.nombre_producto}`;
    let uuid = existingMap.get(key);

    if (!uuid) {
      const { data, error } = await supabase.from('activos').insert({
        usuario_id: usuarioId,
        clase: asset.clase,
        categoria: asset.categoria,
        subcategoria: asset.subcategoria,
        institucion: asset.institucion,
        nombre_producto: asset.nombre_producto,
        ticker: asset.ticker,
        moneda_base: asset.moneda_base,
        estado: 'activo'
      }).select().single();

      if (error) {
        console.error(`❌ Error insertando activo ${asset.nombre_producto}:`, error.message);
        continue;
      }
      uuid = data.id;
      existingMap.set(key, uuid);
    }
    assetsMap.set(idExterno, uuid!);
  }

  // 4. Procesar Histórico y Sumar Duplicados
  const snapshotGroups = new Map<string, {
    activo_id: string;
    fecha: string;
    valor_original: number;
    tipo_cambio_clp: number;
    valor_clp: number;
  }>();

  for (let i = 0; i < historico.length; i++) {
    const row = historico[i];
    let idActivo = row.ID_Activo;
    let nombre = row.Nombre_Producto;
    let institucion = row.Institución;

    // Repetir lógica de fallback para consistencia
    if (idActivo && idActivo.includes(' ')) {
      const temp = idActivo;
      idActivo = nombre;
      nombre = temp;
    }

    const uuid = assetsMap.get(idActivo);
    if (!uuid) {
      console.warn(`⚠️ No se encontró UUID para ID_Activo: ${idActivo}. Saltando fila.`);
      continue;
    }

    const fecha = parseDate(row.Fecha);
    const groupKey = `${uuid}|${fecha}`;

    // Manejo de Vacíos (Valor_CLP)
    let valorClp = parseFloat(row.Valor_CLP.replace(/,/g, ''));
    if (isNaN(valorClp) || row.Valor_CLP === '') {
      console.warn(`⚠️ Fila ${i + 2}: Valor_CLP vacío para ${idActivo} en ${row.Fecha}. Asignando 0.`);
      
      // Intentar calcular si existe valor original y tipo cambio
      const valOrig = parseFloat(row.Valor_Original.replace(/,/g, ''));
      const tc = parseFloat(row.Tipo_Cambio_a_CLP.replace(/,/g, ''));
      if (!isNaN(valOrig) && !isNaN(tc)) {
        valorClp = valOrig * tc;
        console.log(`   💡 Calculado Valor_CLP: ${valorClp} (${valOrig} * ${tc})`);
      } else {
        valorClp = 0;
      }
    }

    const valOrig = parseFloat(row.Valor_Original.replace(/,/g, '')) || 0;
    const tc = parseFloat(row.Tipo_Cambio_a_CLP.replace(/,/g, '')) || 1;

    if (snapshotGroups.has(groupKey)) {
      const existing = snapshotGroups.get(groupKey)!;
      existing.valor_clp += valorClp;
      existing.valor_original += valOrig; // Sumamos también el original si es la misma moneda? Asumimos consolidación.
      // tc se mantiene igual o promediado? Generalmente se mantiene el de la fila.
    } else {
      snapshotGroups.set(groupKey, {
        activo_id: uuid,
        fecha,
        valor_original: valOrig,
        tipo_cambio_clp: tc,
        valor_clp: valorClp
      });
    }
  }

  const snapshotsToInsert = Array.from(snapshotGroups.values());
  console.log(`📊 Total de snapshots consolidados a insertar: ${snapshotsToInsert.size ?? snapshotsToInsert.length}`);

  // 5. Insertar Snapshots (en batches para evitar límites)
  const batchSize = 100;
  let insertedCount = 0;

  for (let i = 0; i < snapshotsToInsert.length; i += batchSize) {
    const batch = snapshotsToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('snapshots').upsert(batch, {
      onConflict: 'activo_id, fecha'
    });

    if (error) {
      console.error(`❌ Error insertando batch ${i / batchSize}:`, error.message);
    } else {
      insertedCount += batch.length;
    }
  }

  console.log(`✅ Migración completada. ${insertedCount} snapshots insertados/actualizados.`);
}

run().catch(err => {
  console.error('💥 Error fatal en la migración:', err);
});
