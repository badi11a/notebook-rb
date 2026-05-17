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

const fmt = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

async function reportMayFirst() {
  const { data: user } = await supabase.auth.admin.listUsers();
  const targetUser = user.users.find(u => u.email === 'badilla@gmail.com');
  const userId = targetUser.id;

  const { data: snapshots, error } = await supabase
    .from('snapshots')
    .select('valor_clp, activos(nombre_producto, institucion, clase)')
    .eq('fecha', '2026-05-01')
    .order('valor_clp', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  const report = snapshots
    .filter(s => s.activos)
    .map(s => ({
      Producto: `${s.activos.nombre_producto} (${s.activos.institucion})`,
      Tipo: s.activos.clase,
      Valor_CLP: fmt.format(s.valor_clp)
    }));

  console.log(`\n--- REPORTE PATRIMONIO: 01-05-2026 ---`);
  console.table(report);
}

reportMayFirst().catch(console.error);
