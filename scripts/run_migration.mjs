import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Función para extraer variables manualmente de .env.local
function getEnvVar(key) {
  try {
    const envPath = path.join(projectRoot, '.env.local');
    if (!fs.existsSync(envPath)) return null;
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      const [k, ...v] = trimmedLine.split('=');
      if (k.trim() === key) {
        // Limpiar comillas y espacios
        return v.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch (err) {
    console.error(`Error leyendo .env.local: ${err.message}`);
  }
  return null;
}

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const serviceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

console.log(`\n--- Debug Credenciales ---`);
console.log(`URL: ${supabaseUrl}`);
if (serviceRoleKey) {
  console.log('Key cargada:', serviceRoleKey.substring(0, 5) + '...');
} else {
  console.log('Key cargada: FAILED (null/undefined)');
}
console.log(`--------------------------\n`);

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: No se pudo extraer NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY de .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

function parseDate(str) {
  if (!str) return null;
  const [d, m, y] = str.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseNum(val) {
  if (!val || val.trim() === '') return 0;
  return parseFloat(val.replace(/,/g, '')) || 0;
}

async function getUsuarioId() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  const user = data.users.find(u => u.email === 'badilla@gmail.com');
  if (!user) throw new Error('Usuario badilla@gmail.com no encontrado');
  return user.id;
}

async function run() {
  const userId = await getUsuarioId();
  console.log(`Usuario ID: ${userId}`);

  // 0. BORRADO SELECTIVO (Limpiar datos previos del usuario)
  console.log('Iniciando borrado selectivo para el usuario...');
  
  const { data: activosParaBorrar } = await supabase
    .from('activos')
    .select('id')
    .eq('usuario_id', userId);

  if (activosParaBorrar && activosParaBorrar.length > 0) {
    const ids = activosParaBorrar.map(a => a.id);
    await supabase.from('snapshots').delete().in('activo_id', ids);
    await supabase.from('activos').delete().eq('usuario_id', userId);
    console.log(`Datos previos eliminados.`);
  }

  // 1. PROCESAR CATÁLOGO
  const catalogoRows = await readCsv(path.join(projectRoot, 'Balance_Master_2026 - Catalogo_Activos.csv'));
  const activosMap = new Map(); // "institucion|nombre" -> UUID
  const idExternoToUuid = new Map(); // ID_Activo (CSV) -> UUID

  console.log('Procesando catálogo...');

  for (const row of catalogoRows) {
    let idExterno = row['ID_Activo']?.trim();
    let nombre = row['Nombre_Producto']?.trim();
    const institucion = row['Institución']?.trim() || '(N/A)';

    if (idExterno && idExterno.includes(' ')) {
      [idExterno, nombre] = [nombre, idExterno];
    }
    if (!idExterno) continue;

    const clave = `${institucion}|${nombre || idExterno}`;
    let uuid = activosMap.get(clave);

    if (!uuid) {
      const { data, error } = await supabase
        .from('activos')
        .insert({
          usuario_id: userId,
          clase: row['Clase'] || 'Activo',
          categoria: row['Categoría'] || 'Sin Categoría',
          subcategoria: row['Subcategoría'] || null,
          institucion,
          nombre_producto: nombre || idExterno,
          ticker: row['Ticker'] || null,
          moneda_base: 'CLP',
          estado: 'activo'
        })
        .select('id')
        .single();

      if (error) {
        console.error(`Error al insertar activo ${idExterno}:`, error.message);
        continue;
      }
      uuid = data.id;
      activosMap.set(clave, uuid);
    }
    idExternoToUuid.set(idExterno, uuid);
  }

  // 2. PROCESAR HISTÓRICO
  const historicoRows = await readCsv(path.join(projectRoot, 'Balance_Master_2026 - Historico.csv'));
  const snapshotsConsolidados = new Map(); // "UUID|fecha" -> data

  console.log('Procesando histórico...');
  for (const row of historicoRows) {
    let idExterno = row['ID_Activo']?.trim();
    let nombre = row['Nombre_Producto']?.trim();
    const institucion = row['Institución']?.trim() || '(N/A)';

    if (idExterno && idExterno.includes(' ')) {
      [idExterno, nombre] = [nombre, idExterno];
    }
    if (!idExterno) continue;

    let uuid = idExternoToUuid.get(idExterno);

    if (!uuid) {
      const clave = `${institucion}|${nombre || idExterno}`;
      uuid = activosMap.get(clave);

      if (!uuid) {
        const { data, error } = await supabase
          .from('activos')
          .insert({
            usuario_id: userId,
            clase: row['Clase'] || 'Activo',
            categoria: row['Categoría'] || 'Sin Categoría',
            subcategoria: row['Subcategoría'] || null,
            institucion,
            nombre_producto: nombre || idExterno,
            ticker: row['Ticker'] || null,
            moneda_base: row['Moneda'] || 'CLP',
            estado: 'activo'
          })
          .select('id')
          .single();

        if (error) {
          console.error(`Error al insertar activo desde histórico ${idExterno}:`, error.message);
          continue;
        }
        uuid = data.id;
        activosMap.set(clave, uuid);
      }
      idExternoToUuid.set(idExterno, uuid);
    }

    const fecha = parseDate(row['Fecha']);
    if (!fecha) continue;

    const valorClp = row['Valor_CLP'] && row['Valor_CLP'].trim() !== '' ? parseNum(row['Valor_CLP']) : 0;
    const valorOriginal = parseNum(row['Valor_Original']);
    const tipoCambio = parseNum(row['Tipo_Cambio_a_CLP']) || 1;

    const claveSnap = `${uuid}|${fecha}`;
    if (snapshotsConsolidados.has(claveSnap)) {
      const exist = snapshotsConsolidados.get(claveSnap);
      exist.valor_original += valorOriginal;
      exist.valor_clp += valorClp;
    } else {
      snapshotsConsolidados.set(claveSnap, {
        activo_id: uuid,
        fecha: fecha,
        valor_original: valorOriginal,
        tipo_cambio_clp: tipoCambio,
        valor_clp: valorClp
      });
    }
  }

  // 3. INSERTAR SNAPSHOTS
  console.log(`Insertando ${snapshotsConsolidados.size} snapshots...`);
  const snapshotsArray = Array.from(snapshotsConsolidados.values());
  const BATCH_SIZE = 1000;
  let totalInsertados = 0;

  for (let i = 0; i < snapshotsArray.length; i += BATCH_SIZE) {
    const batch = snapshotsArray.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('snapshots')
      .upsert(batch, { onConflict: 'activo_id,fecha' });

    if (error) {
      console.error(`Error al insertar batch snapshots ${i / BATCH_SIZE}:`, error.message);
    } else {
      totalInsertados += batch.length;
    }
  }

  console.log(`\nMigración completada.`);
  console.log(`Activos procesados: ${activosMap.size}`);
  console.log(`Snapshots procesados: ${totalInsertados}`);
}

run().catch(console.error);
