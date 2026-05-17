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

const FUND_UPDATES = [
  { term: 'competitivo', inst: 'bci', name: 'Bci Competitivo Fondo Mutuo' },
  { term: 'money market', inst: 'itau', name: 'Money Market Itaú' },
  { term: 'conservador', inst: 'betterplan', name: 'Betterplan Portafolio Conservador' },
  { term: 'moderado', inst: 'betterplan', name: 'Betterplan Portafolio Moderado' },
  { term: 'arriesgado', inst: 'soyfocus', name: 'Soyfocus Octubre Arriesgado' },
  { term: 'moderado', inst: 'soyfocus', name: 'Soyfocus Octubre Moderado' }
];

async function updateFunds() {
  console.log('Mejorando nombres de Fondos Mutuos...');
  for (const item of FUND_UPDATES) {
    const { error } = await supabase
      .from('activos')
      .update({ nombre_producto: item.name })
      .ilike('nombre_producto', `%${item.term}%`)
      .ilike('institucion', `%${item.inst}%`);

    if (error) {
      console.error(`Error actualizando ${item.term}:`, error.message);
    } else {
      console.log(`✅ ${item.name} actualizado.`);
    }
  }
}

updateFunds().catch(console.error);
