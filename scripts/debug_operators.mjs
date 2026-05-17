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

function getCategoria(clase, cat, sub, inst, nombre) {
  clase = (clase || '').toLowerCase();
  cat = (cat || '').toLowerCase();
  sub = (sub || '').toLowerCase();
  inst = (inst || '').toLowerCase();
  nombre = (nombre || '').toLowerCase();

  if (clase.includes('pasivo')) return 'pasivo';
  if (cat.includes('propiedades') || nombre.includes('huanuco') || nombre.includes('carmen')) return 'raices';
  if (sub.includes('apv') || sub.includes('afp') || cat.includes('afp') || cat.includes('apv') || nombre.includes('jubilacion')) return 'previsional';
  if (clase.includes('alternativo') || cat.includes('alternativa') || sub.includes('alternativa') || (inst.includes('betterplan') && !nombre.includes('caja'))) return 'alternativa';
  if (nombre.includes('más') || nombre.includes('mas') || clase.includes('etf') || clase.includes('acción') || clase.includes('accion') || clase.includes('fondo mutuo') || sub.includes('etf') || sub.includes('acción') || sub.includes('accion') || sub.includes('fondo mutuo') || inst.includes('itau') || inst.includes('bci') || (inst.includes('consorcio') && !nombre.includes('vista'))) return 'financiera';
  return 'caja';
}

async function debugOperators() {
  const { data: snapshots, error } = await supabase
    .from('snapshots')
    .select('valor_clp, activos!inner(nombre_producto, institucion, clase, categoria, subcategoria)')
    .eq('fecha', '2026-05-01');

  if (error) { console.error('Error:', error); return; }

  const instSaldos = {};

  snapshots.forEach(s => {
    const a = s.activos;
    const cat = getCategoria(a.clase, a.categoria, a.subcategoria, a.institucion, a.nombre_producto);
    
    if (['financiera', 'alternativa', 'caja'].includes(cat)) {
        const inst = a.institucion === '(N/A)' ? a.nombre_producto : a.institucion;
        instSaldos[inst] = (instSaldos[inst] || 0) + s.valor_clp;
    }
  });

  console.log('\n--- OPERADORES QUE COMPONEN EL AUM ($159.5M) ---');
  let count = 0;
  Object.entries(instSaldos).sort((a,b) => b[1] - a[1]).forEach(([inst, saldo]) => {
    if (saldo > 0) {
        count++;
        console.log(`${count}. ${inst}: $${(saldo/1e6).toFixed(1)}M`);
    }
  });
  console.log(`\nTotal Operadores AUM: ${count}`);
}

debugOperators().catch(console.error);
