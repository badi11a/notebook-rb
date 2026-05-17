import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

function getEnvVar(key) {
  try {
    const envPath = path.join(projectRoot, '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmedLine = line.trim();
      const [k, ...v] = trimmedLine.split('=');
      if (k.trim() === key) return v.join('=').trim().replace(/^["']|["']$/g, '');
    }
  } catch (err) {}
  return null;
}

const supabase = createClient(getEnvVar('NEXT_PUBLIC_SUPABASE_URL'), getEnvVar('SUPABASE_SERVICE_ROLE_KEY'));

function getCategoriaPlan(s) {
  const clase = (s.clase || '').toLowerCase();
  const cat = (s.categoria || '').toLowerCase();
  const sub = (s.subcategoria || '').toLowerCase();

  if (clase.includes('pasivo')) return 'pasivo';
  if (cat.includes('fijo')) {
    if (sub.includes('propiedades')) return 'raices';
    if (sub.includes('afp') || sub.includes('apv')) return 'previsional';
  }
  if (cat.includes('inversión líquida') || cat.includes('inversion liquida')) return 'financiera';
  if (cat.includes('inversión poco líquida') || cat.includes('inversion poco liquida')) return 'alternativa';
  return 'caja';
}

async function syncResumen() {
  const { data: user } = await supabase.auth.admin.listUsers();
  const userId = user.users.find(u => u.email === 'badilla@gmail.com').id;

  console.log('Obteniendo snapshots...');
  const { data: snaps, error } = await supabase
    .from('snapshots')
    .select('fecha, valor_clp, activos!inner(clase, categoria, subcategoria)')
    .eq('activos.usuario_id', userId);

  if (error) throw error;

  // Agrupar por fecha
  const porFecha = new Map();
  snaps.forEach(s => {
    if (!porFecha.has(s.fecha)) {
      porFecha.set(s.fecha, { bruto: 0, pasivos: 0, aum: 0, counts: 0 });
    }
    const day = porFecha.get(s.fecha);
    const cat = getCategoriaPlan(s.activos);
    
    if (cat === 'pasivo') {
      day.pasivos += s.valor_clp;
    } else {
      day.bruto += s.valor_clp;
      if (['financiera', 'alternativa', 'caja'].includes(cat)) {
        day.aum += s.valor_clp;
      }
    }
    day.counts += 1;
  });

  // Filtrar fechas válidas (> 2 registros) y seleccionar última de cada mes
  const fechasValidas = Array.from(porFecha.entries())
    .filter(([_, data]) => data.counts > 2)
    .sort((a, b) => a[0].localeCompare(b[0]));

  const cierresMensuales = new Map();
  fechasValidas.forEach(([fecha, data]) => {
    const mesKey = fecha.substring(0, 7);
    cierresMensuales.set(mesKey, { fecha, ...data });
  });

  const resumenRows = Array.from(cierresMensuales.values()).map(d => ({
    usuario_id: userId,
    fecha: d.fecha,
    bruto: Math.round(d.bruto),
    pasivos: Math.round(d.pasivos),
    neto: Math.round(d.bruto - d.pasivos),
    aum: Math.round(d.aum),
    liquido: Math.round(d.aum - d.pasivos)
  }));

  console.log(`Insertando ${resumenRows.length} filas en resumen_mensual...`);
  const { error: insError } = await supabase
    .from('resumen_mensual')
    .upsert(resumenRows, { onConflict: 'usuario_id,fecha' });

  if (insError) throw insError;
  console.log('Sincronización completada.');
}

syncResumen().catch(console.error);
