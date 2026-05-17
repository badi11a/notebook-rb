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

async function verifyMayFirst() {
  const { data: user } = await supabase.auth.admin.listUsers();
  const targetUser = user.users.find(u => u.email === 'badilla@gmail.com');
  const userId = targetUser.id;

  console.log(`\n--- Snapshots del 1 de Mayo (Usuario: ${userId}) ---`);
  const { data: snapshots, error } = await supabase
    .from('snapshots')
    .select('*, activos(nombre_producto, institucion)')
    .eq('fecha', '2026-05-01')
    .order('valor_clp', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  const flattened = snapshots
    .filter(s => s.activos) // Asegurar que el join funcionó (RLS/Permissions)
    .map(s => ({
      producto: s.activos.nombre_producto,
      institucion: s.activos.institucion,
      valor_original: s.valor_original,
      valor_clp: s.valor_clp,
      tc: s.tipo_cambio_clp
    }));

  if (flattened.length === 0) {
    console.log('No se encontraron snapshots para el 1 de Mayo de 2026.');
  } else {
    console.table(flattened);
    console.log(`Total filas encontradas para esta fecha: ${flattened.length}`);
  }
}

verifyMayFirst().catch(console.error);
