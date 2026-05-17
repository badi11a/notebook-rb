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

async function debugData() {
  const { data: allSnaps, error: err1 } = await supabase.from('snapshots').select('fecha');
  if (err1) { console.error('Error err1:', err1); return; }
  if (!allSnaps) { console.error('allSnaps es null'); return; }

  const counts = {};
  allSnaps.forEach(s => counts[s.fecha] = (counts[s.fecha] || 0) + 1);
  
  const entries = Object.entries(counts).filter(([f, c]) => c > 2).sort((a,b) => b[0].localeCompare(a[0]));
  if (entries.length === 0) { console.error('No hay fechas válidas'); return; }
  
  const lastDate = entries[0][0];
  console.log(`--- ÚLTIMA FECHA VÁLIDA DETECTADA: ${lastDate} ---`);

  const { data: snapshots, error: err2 } = await supabase
    .from('snapshots')
    .select('valor_clp, activos(nombre_producto, institucion, clase, categoria)')
    .eq('fecha', lastDate);

  if (err2) { console.error('Error err2:', err2); return; }

  snapshots.forEach(s => {
    if (!s.activos) {
        console.log(`- [ERROR: SIN ACTIVO] Valor: ${s.valor_clp}`);
        return;
    }
    console.log(`- ${s.activos.nombre_producto} | Inst: ${s.activos.institucion} | Clase: ${s.activos.clase} | Cat: ${s.activos.categoria} | Valor: ${s.valor_clp}`);
  });
}

debugData().catch(console.error);
