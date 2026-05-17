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

async function verify() {
  const { data: user } = await supabase.auth.admin.listUsers();
  const targetUser = user.users.find(u => u.email === 'badilla@gmail.com');
  const userId = targetUser.id;

  console.log(`\n--- Muestra Activos (Usuario: ${userId}) ---`);
  const { data: activos } = await supabase
    .from('activos')
    .select('*')
    .eq('usuario_id', userId)
    .limit(5);
  console.table(activos);

  console.log(`\n--- Muestra Snapshots (Usuario: ${userId}) ---`);
  const { data: snapshots } = await supabase
    .from('snapshots')
    .select('*, activos(nombre_producto)')
    .eq('activos.usuario_id', userId)
    .limit(5);
  
  // Aplanar para mejor visualización
  const flattenedSnapshots = snapshots.map(s => ({
    fecha: s.fecha,
    producto: s.activos.nombre_producto,
    valor_original: s.valor_original,
    valor_clp: s.valor_clp,
    tc: s.tipo_cambio_clp
  }));
  console.table(flattenedSnapshots);
}

verify().catch(console.error);
