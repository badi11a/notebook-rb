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

const TICKER_UPDATES = [
  { term: 'Bci Competitivo', ticker: 'BCI-COMP' },
  { term: 'Money Market Itaú', ticker: 'ITAU-MM' },
  { term: 'Soyfocus Octubre Arriesgado', ticker: 'SF-ARR' },
  { term: 'Soyfocus Octubre Moderado', ticker: 'SF-MOD' },
  { term: 'Betterplan Portafolio Conservador', ticker: 'BP-CON' },
  { term: 'Betterplan Portafolio Moderado', ticker: 'BP-MOD' }
];

async function updateTickers() {
  console.log('Asignando tickers internos a Fondos Mutuos...');
  for (const item of TICKER_UPDATES) {
    const { error } = await supabase
      .from('activos')
      .update({ ticker: item.ticker })
      .ilike('nombre_producto', `%${item.term}%`);

    if (error) {
      console.error(`Error actualizando ${item.term}:`, error.message);
    } else {
      console.log(`✅ [${item.ticker}] asignado a ${item.term}`);
    }
  }
}

updateTickers().catch(console.error);
