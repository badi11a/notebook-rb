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

async function inspectCfiNasdaq() {
  const { data, error } = await supabase
    .from('activos')
    .select('*, snapshots(*)')
    .ilike('ticker', '%nasdaq%')
    .limit(1);

  if (error) { console.error(error); return; }
  console.log(JSON.stringify(data, null, 2));
}

inspectCfiNasdaq().catch(console.error);
