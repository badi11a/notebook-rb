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

// MISMA LÓGICA QUE Dashboard.tsx
function getCategoriaPlan(s) {
  const clase = (s.clase || '').toLowerCase();
  const cat = (s.categoria || '').toLowerCase();
  const sub = (s.subcategoria || '').toLowerCase();
  const inst = (s.institucion || '').toLowerCase();
  const nombre = (s.nombre_producto || '').toLowerCase();

  if (clase.includes('pasivo')) return 'pasivo';
  if (cat.includes('propiedades') || nombre.includes('huanuco') || nombre.includes('carmen')) return 'raices';
  if (inst.includes('soyfocus') || inst.includes('habitat') || sub.includes('apv') || sub.includes('afp') || cat.includes('afp') || cat.includes('apv')) return 'previsional';
  if (inst.includes('itau') || (inst.includes('bci') && !inst.includes('black')) || (inst.includes('consorcio') && (nombre.includes('más') || nombre.includes('mas'))) || clase.includes('etf') || clase.includes('acción') || clase.includes('accion') || clase.includes('fondo mutuo')) return 'financiera';
  if (inst.includes('betterplan') || inst.includes('honorarios') || inst.includes('castro') || inst.includes('badilla') || cat.includes('alternativa')) return 'alternativa';
  return 'caja';
}

async function debugCash() {
  const { data: snapshots, error } = await supabase
    .from('snapshots')
    .select('valor_clp, activos!inner(nombre_producto, institucion, clase, categoria, subcategoria)')
    .eq('fecha', '2026-05-01');

  if (error) { console.error(error); return; }

  console.log('\n--- DETALLE DE CAJA Y EQUIVALENTES ($21.3M) ---');
  let total = 0;
  
  snapshots.forEach(s => {
    const a = s.activos;
    if (getCategoriaPlan(a) === 'caja') {
      total += s.valor_clp;
      console.log(`- ${a.nombre_producto} (${a.institucion}): $${s.valor_clp.toLocaleString('es-CL')}`);
    }
  });

  console.log(`\nTOTAL CALCULADO: $${total.toLocaleString('es-CL')}`);
}

debugCash().catch(console.error);
