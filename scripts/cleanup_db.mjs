import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cleanup() {
  console.log('Borrando snapshots...');
  const { error: errSnap } = await supabase.from('snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errSnap) console.error('Error borrando snapshots:', errSnap.message);

  console.log('Borrando activos...');
  const { error: errAct } = await supabase.from('activos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errAct) console.error('Error borrando activos:', errAct.message);

  console.log('Limpieza completada (si los permisos lo permitieron).');
}

cleanup().catch(console.error);
