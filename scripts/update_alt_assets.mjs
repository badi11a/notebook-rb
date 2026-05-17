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
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      const [k, ...v] = trimmedLine.split('=');
      if (k.trim() === key) return v.join('=').trim().replace(/^["']|["']$/g, '');
    }
  } catch (err) {}
  return null;
}

const supabase = createClient(getEnvVar('NEXT_PUBLIC_SUPABASE_URL'), getEnvVar('SUPABASE_SERVICE_ROLE_KEY'));

const ALT_UPDATES = [
  { term: 'independencia', ticker: 'INDEP', name: 'Independencia Rentas Inmobiliarias' },
  { term: 'mbi deuda', ticker: 'MBI-DA', name: 'MBI Deuda Alternativa' },
  { term: 'ameris', ticker: 'AMERIS-CP', name: 'Ameris Financiamiento Corto Plazo' },
  { term: 'caja', inst: 'betterplan', ticker: 'BP-CASH', name: 'Caja Custodia Betterplan' }
];

async function updateAlts() {
  console.log('Actualizando identificadores de activos alternativos (Búsqueda por términos)...');
  
  for (const item of ALT_UPDATES) {
    let query = supabase.from('activos').update({ 
      ticker: item.ticker,
      nombre_producto: item.name
    }).ilike('nombre_producto', `%${item.term}%`);

    if (item.inst) {
        query = query.ilike('institucion', `%${item.inst}%`);
    }

    const { error } = await query;

    if (error) {
      console.error(`Error actualizando ${item.term}:`, error.message);
    } else {
      console.log(`✅ [${item.ticker}] ${item.name} actualizado.`);
    }
  }
}

updateAlts().catch(console.error);
