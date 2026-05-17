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

const UPDATES = [
  { ticker: 'CFMDIVO', name: 'ETF It Now S&P/CLX Chile Dividend Index' },
  { ticker: 'CAP', name: 'CAP S.A.' },
  { ticker: 'CENCOSUD', name: 'Cencosud S.A.' },
  { ticker: 'CFIETFCC', name: 'ETF Singular Chile Corporativo' },
  { ticker: 'CFINASDAQ', name: 'ETF Singular Nasdaq 100' },
  { ticker: 'ENELCHILE', name: 'Enel Chile S.A.' },
  { ticker: 'HABITAT', name: 'AFP Habitat S.A.' },
  { ticker: 'CFIETFCD', name: 'ETF Singular Chile Corta Duración' },
  { ticker: 'BCI', name: 'Banco de Crédito e Inversiones' },
  { ticker: 'CHILE', name: 'Banco de Chile' },
  { ticker: 'CFIETFGE', name: 'ETF Singular Global Equities' }
];

async function updateNames() {
  console.log('Actualizando nombres oficiales en la base de datos...');
  
  for (const item of UPDATES) {
    const { error } = await supabase
      .from('activos')
      .update({ nombre_producto: item.name })
      .ilike('ticker', item.ticker);

    if (error) {
      console.error(`Error actualizando ${item.ticker}:`, error.message);
    } else {
      console.log(`✅ ${item.ticker} actualizado a: ${item.name}`);
    }
  }
  
  console.log('\nNombres actualizados correctamente.');
}

updateNames().catch(console.error);
