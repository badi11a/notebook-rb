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

async function check() {
  console.log('Consultando activos...');
  const { data: activos, error: errActivos, count: countActivos } = await supabase
    .from('activos')
    .select('*', { count: 'exact' });
  
  if (errActivos) {
    console.error('Error activos:', errActivos);
  } else {
    console.log(`Total Activos: ${countActivos}`);
  }

  console.log('Consultando snapshots...');
  const { data: snapshots, error: errSnapshots, count: countSnapshots } = await supabase
    .from('snapshots')
    .select('*', { count: 'exact' })
    .limit(2);

  if (errSnapshots) {
    console.error('Error snapshots:', errSnapshots);
  } else {
    console.log(`Total Snapshots: ${countSnapshots}`);
    console.log('Primeros 2:', JSON.stringify(snapshots, null, 2));
  }
}

check().catch(console.error);
