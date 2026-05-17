import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

function getEnvVar(key) {
  try {
    const envPath = path.join(projectRoot, '.env.local');
    if (!fs.existsSync(envPath)) return null;
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      const [k, ...v] = trimmedLine.split('=');
      if (k.trim() === key) {
        return v.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch (err) {
    console.error(`Error leyendo .env.local: ${err.message}`);
  }
  return null;
}

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const serviceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cleanupSparseDates() {
  console.log('Consultando fechas...');
  const { data, error } = await supabase.from('snapshots').select('fecha');
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  const counts = new Map();
  data.forEach(r => counts.set(r.fecha, (counts.get(r.fecha) || 0) + 1));

  const toDelete = Array.from(counts.entries())
    .filter(([_, count]) => count <= 2)
    .map(([fecha]) => fecha);

  if (toDelete.length > 0) {
    console.log(`Borrando registros de las fechas: ${toDelete.join(', ')}`);
    const { error: delError } = await supabase
      .from('snapshots')
      .delete()
      .in('fecha', toDelete);
    
    if (delError) console.error('Error al borrar:', delError.message);
    else console.log('Limpieza completada.');
  } else {
    console.log('No se encontraron fechas con 2 o menos registros.');
  }
}

cleanupSparseDates().catch(console.error);
