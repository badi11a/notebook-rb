import { getSupabaseClient } from './supabase'
import type { Activo, SnapshotConActivo, TipoCambio, HistorialFecha, ResumenMensual } from '../types'

export async function getActivosActivos(): Promise<Activo[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('activos')
    .select('*')
    .eq('estado', 'activo')
    .order('clase')
    .order('institucion')
  if (error) throw error
  return data ?? []
}

export async function getSnapshotsPorFecha(fecha: string): Promise<SnapshotConActivo[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('snapshots')
    .select(`
      id, activo_id, fecha, valor_original, tipo_cambio_clp, valor_clp, created_at,
      activos!inner(nombre_producto, institucion, clase, categoria, subcategoria, moneda_base, ticker)
    `)
    .eq('fecha', fecha)
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    id: row.id,
    activo_id: row.activo_id,
    fecha: row.fecha,
    valor_original: row.valor_original,
    tipo_cambio_clp: row.tipo_cambio_clp,
    valor_clp: row.valor_clp,
    created_at: row.created_at,
    nombre_producto: row.activos.nombre_producto,
    institucion: row.activos.institucion,
    clase: row.activos.clase,
    categoria: row.activos.categoria,
    subcategoria: row.activos.subcategoria,
    moneda_base: row.activos.moneda_base,
    ticker: row.activos.ticker,
  }))
}

// Determina la última fecha "válida" (con más de 2 registros) y devuelve los snapshots de esa fecha exacta
export async function getUltimoSnapshot(): Promise<SnapshotConActivo[]> {
  const supabase = getSupabaseClient()
  
  // 1. Obtener todas las fechas para encontrar la última válida
  const { data: fechasData, error: fechasError } = await supabase
    .from('snapshots')
    .select('fecha')
    .order('fecha', { ascending: false })
  
  if (fechasError) throw fechasError

  const counts = new Map<string, number>()
  for (const row of fechasData ?? []) {
    counts.set(row.fecha, (counts.get(row.fecha) ?? 0) + 1)
  }

  const ultimaFechaValida = Array.from(counts.entries())
    .find(([_, count]) => count > 2)?.[0]

  if (!ultimaFechaValida) return []

  // 2. Obtener snapshots solo de esa fecha
  const { data, error } = await supabase
    .from('snapshots')
    .select(`
      id, activo_id, fecha, valor_original, tipo_cambio_clp, valor_clp, created_at,
      activos!inner(nombre_producto, institucion, clase, categoria, subcategoria, moneda_base, ticker, estado)
    `)
    .eq('fecha', ultimaFechaValida)

  if (error) throw error

  return (data ?? [])
    .filter((row: any) => row.activos.estado === 'activo')
    .map((row: any) => ({
      id: row.id,
      activo_id: row.activo_id,
      fecha: row.fecha,
      valor_original: row.valor_original,
      tipo_cambio_clp: row.tipo_cambio_clp,
      valor_clp: row.valor_clp,
      created_at: row.created_at,
      nombre_producto: row.activos.nombre_producto,
      institucion: row.activos.institucion,
      clase: row.activos.clase,
      categoria: row.activos.categoria,
      subcategoria: row.activos.subcategoria,
      moneda_base: row.activos.moneda_base,
      ticker: row.activos.ticker,
    }))
}

// GROUP BY fecha equivalente con agregación client-side. Ignora fechas con <= 2 registros.
// Resta el valor si la clase es 'Pasivo' (Neto = Activos - Pasivos)
export async function getHistorial12M(): Promise<HistorialFecha[]> {
  const supabase = getSupabaseClient()
  const fechaMin = new Date()
  fechaMin.setMonth(fechaMin.getMonth() - 12)
  const fechaMinStr = fechaMin.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('snapshots')
    .select('fecha, valor_clp, activos!inner(clase)')
    .gte('fecha', fechaMinStr)
    .order('fecha', { ascending: true })
  if (error) throw error

  const totals = new Map<string, number>()
  const counts = new Map<string, number>()
  
  for (const row of data ?? []) {
    const valor = Number(row.valor_clp)
    const esPasivo = (row.activos as any).clase === 'Pasivo'
    const montoFinal = esPasivo ? -valor : valor

    totals.set(row.fecha, (totals.get(row.fecha) ?? 0) + montoFinal)
    counts.set(row.fecha, (counts.get(row.fecha) ?? 0) + 1)
  }
  
  const dailyTotals = Array.from(totals.entries())
    .filter(([fecha, _]) => (counts.get(fecha) ?? 0) > 2)
    .map(([fecha, total_clp]) => ({ fecha, total_clp }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  // Agrupar por mes y seleccionar solo la fecha más reciente (la última) de cada mes
  const porMes = new Map<string, HistorialFecha>()
  for (const entry of dailyTotals) {
    const mesKey = entry.fecha.substring(0, 7) // YYYY-MM
    porMes.set(mesKey, entry) // El Map.set sobreescribe, quedándose con la última fecha al estar ordenado ASC
  }

  return Array.from(porMes.values())
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// Obtiene los snapshots de las dos últimas fechas válidas para comparar rendimientos
export async function getSnapshotsComparativa(): Promise<{ actual: SnapshotConActivo[], anterior: SnapshotConActivo[] }> {
  const supabase = getSupabaseClient()
  
  const { data: fechasData } = await supabase
    .from('snapshots')
    .select('fecha')
    .order('fecha', { ascending: false })

  const counts = new Map<string, number>()
  for (const row of fechasData ?? []) {
    counts.set(row.fecha, (counts.get(row.fecha) ?? 0) + 1)
  }

  const fechasValidas = Array.from(counts.entries())
    .filter(([_, count]) => count > 2)
    .map(([f]) => f)

  if (fechasValidas.length < 1) return { actual: [], anterior: [] }
  
  const actualFecha = fechasValidas[0]
  const anteriorFecha = fechasValidas[1] || null

  const fetchPorFecha = async (f: string | null) => {
    if (!f) return []
    const { data } = await supabase
      .from('snapshots')
      .select(`
        id, activo_id, fecha, valor_original, tipo_cambio_clp, valor_clp, created_at,
        activos!inner(nombre_producto, institucion, clase, categoria, subcategoria, moneda_base, ticker, estado)
      `)
      .eq('fecha', f)
      .eq('activos.estado', 'activo')
    
    return (data ?? []).map((row: any) => ({
      id: row.id,
      activo_id: row.activo_id,
      fecha: row.fecha,
      valor_original: row.valor_original,
      tipo_cambio_clp: row.tipo_cambio_clp,
      valor_clp: row.valor_clp,
      created_at: row.created_at,
      nombre_producto: row.activos.nombre_producto,
      institucion: row.activos.institucion,
      clase: row.activos.clase,
      categoria: row.activos.categoria,
      subcategoria: row.activos.subcategoria,
      moneda_base: row.activos.moneda_base,
      ticker: row.activos.ticker,
    }))
  }

  const [actual, anterior] = await Promise.all([
    fetchPorFecha(actualFecha),
    fetchPorFecha(anteriorFecha)
  ])

  return { actual, anterior }
}

export async function getResumenMensual(): Promise<ResumenMensual[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('resumen_mensual')
    .select('*')
    .order('fecha', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getTiposCambioRecientes(): Promise<TipoCambio | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('tipos_cambio')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function insertSnapshot(
  activo_id: string,
  fecha: string,
  valor_original: number,
  tipo_cambio_clp: number,
  valor_clp: number,
): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('snapshots')
    .upsert(
      { activo_id, fecha, valor_original, tipo_cambio_clp, valor_clp },
      { onConflict: 'activo_id,fecha' },
    )
  if (error) throw error
}

export async function insertTipoCambio(
  fecha: string,
  uf: number,
  usd: number,
  utm: number,
): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('tipos_cambio')
    .upsert(
      { fecha, uf, usd, utm },
      { onConflict: 'fecha' },
    )
  if (error) throw error
}
