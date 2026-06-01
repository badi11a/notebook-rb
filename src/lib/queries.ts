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

export async function getActivosInactivos(): Promise<Activo[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('activos')
    .select('*')
    .eq('estado', 'inactivo')
    .order('clase')
    .order('institucion')
  if (error) throw error
  return data ?? []
}

export async function updateActivoEstado(id: string, estado: 'activo' | 'inactivo'): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('activos')
    .update({ estado })
    .eq('id', id)
  if (error) throw error
}

export async function createActivo(activo: {
  clase: string
  categoria: string
  subcategoria: string | null
  institucion: string
  nombre_producto: string
  moneda_base: string
  ticker: string | null
}): Promise<void> {
  const supabase = getSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase
    .from('activos')
    .insert({ ...activo, usuario_id: user.id, estado: 'activo' })
  if (error) throw error
}

export async function syncResumenMensual(): Promise<void> {
  const supabase = getSupabaseClient()

  const { data: snaps, error } = await supabase
    .from('snapshots')
    .select('activo_id, fecha, valor_clp, activos!inner(clase, categoria, subcategoria, institucion)')
    .order('fecha', { ascending: true })

  if (error) throw error

  function getCategoriaPlan(row: any): string {
    const clase = (row.clase || '').toLowerCase()
    const cat   = (row.categoria || '').toLowerCase()
    const sub   = (row.subcategoria || '').toLowerCase()
    const inst  = (row.institucion || '').toLowerCase()
    if (clase.includes('pasivo')) return 'pasivo'
    if (cat.includes('fijo')) {
      if (sub.includes('propiedades')) return 'raices'
      if (sub.includes('afp') || sub.includes('apv')) return 'previsional'
    }
    if (inst.includes('betterplan')) return 'alternativa'
    if (sub.includes('etf')) return 'financiera'
    if (sub.includes('acción') || sub.includes('accion')) return 'financiera'
    if (cat.includes('fondo') || sub.includes('fondo')) return 'financiera'
    if (sub.includes('ahorro') || sub.includes('vista') || sub.includes('corriente')) return 'caja'
    if (cat.includes('inversión') || cat.includes('inversion')) return 'financiera'
    return 'caja'
  }

  // Último valor de cada activo dentro de cada mes
  const porMesActivo = new Map<string, Map<string, { valor_clp: number; cat: string }>>()
  for (const s of snaps ?? []) {
    const mesKey = s.fecha.substring(0, 7)
    if (!porMesActivo.has(mesKey)) {
      porMesActivo.set(mesKey, new Map())
    }
    const cat = getCategoriaPlan(s.activos)
    porMesActivo.get(mesKey)!.set(s.activo_id, { valor_clp: Number(s.valor_clp), cat })
  }

  // Sumar por mes
  const resumenPorMes = new Map<string, { fecha: string; bruto: number; pasivos: number; aum: number }>()
  for (const [mesKey, activosMap] of porMesActivo) {
    let bruto = 0
    let pasivos = 0
    let aum = 0
    for (const [, v] of activosMap) {
      if (v.cat === 'pasivo') {
        pasivos += v.valor_clp
      } else {
        bruto += v.valor_clp
        if (['financiera', 'alternativa', 'caja'].includes(v.cat)) {
          aum += v.valor_clp
        }
      }
    }
    const fechaCanonica = `${mesKey}-01`
    resumenPorMes.set(mesKey, { fecha: fechaCanonica, bruto, pasivos, aum })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const uid = user.id

  const rows = Array.from(resumenPorMes.values()).map(d => ({
    usuario_id: uid,
    fecha: d.fecha,
    bruto: Math.round(d.bruto),
    pasivos: Math.round(d.pasivos),
    neto: Math.round(d.bruto - d.pasivos),
    aum: Math.round(d.aum),
    liquido: Math.round(d.aum - d.pasivos),
  }))

  if (rows.length > 0) {
    const { data: idsToDelete } = await supabase
      .from('resumen_mensual')
      .select('id')

    if (idsToDelete && idsToDelete.length > 0) {
      const { error: delError } = await supabase
        .from('resumen_mensual')
        .delete()
        .in('id', idsToDelete.map((r: any) => r.id))
      if (delError) throw delError
    }

    const { error: insError } = await supabase
      .from('resumen_mensual')
      .upsert(rows, { onConflict: 'usuario_id,fecha' })
    if (insError) throw insError
  }
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

  const hoy = new Date().toISOString().split('T')[0]
  const inicioMes = hoy.substring(0, 7) + '-01'

  const { data, error } = await supabase
    .from('snapshots')
    .select(`
      id, activo_id, fecha, valor_original, tipo_cambio_clp, valor_clp, created_at,
      activos!inner(nombre_producto, institucion, clase, categoria, subcategoria, moneda_base, ticker, estado)
    `)
    .eq('activos.estado', 'activo')
    .gte('fecha', inicioMes)
    .order('fecha', { ascending: false })

  if (error) throw error

  // Último snapshot de cada activo dentro del mes
  const porActivo = new Map<string, any>()
  for (const row of data ?? []) {
    if (!porActivo.has(row.activo_id)) {
      porActivo.set(row.activo_id, row)
    }
  }

  return Array.from(porActivo.values()).map((row: any) => ({
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

  // Deduplicar por mes: solo la fila con fecha canónica (YYYY-MM-01)
  const porMes = new Map<string, ResumenMensual>()
  for (const row of data ?? []) {
    if (!row.fecha.endsWith('-01')) continue
    const mesKey = row.fecha.substring(0, 7)
    if (!porMes.has(mesKey)) {
      porMes.set(mesKey, row)
    }
  }
  return Array.from(porMes.values())
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

export async function getTiposCambioPorFecha(fecha: string): Promise<TipoCambio | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('tipos_cambio')
    .select('*')
    .eq('fecha', fecha)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getSnapshotsPrevios(fecha: string): Promise<SnapshotConActivo[]> {
  const supabase = getSupabaseClient()

  const { data: fechasData, error: fechasError } = await supabase
    .from('snapshots')
    .select('fecha')
    .lt('fecha', fecha)
    .order('fecha', { ascending: false })

  if (fechasError) throw fechasError

  const counts = new Map<string, number>()
  for (const row of fechasData ?? []) {
    counts.set(row.fecha, (counts.get(row.fecha) ?? 0) + 1)
  }

  const fechaPrevia = Array.from(counts.entries())
    .find(([_, count]) => count > 2)?.[0]

  if (!fechaPrevia) return []

  const { data, error } = await supabase
    .from('snapshots')
    .select(`
      id, activo_id, fecha, valor_original, tipo_cambio_clp, valor_clp, created_at,
      activos!inner(nombre_producto, institucion, clase, categoria, subcategoria, moneda_base, ticker, estado)
    `)
    .eq('fecha', fechaPrevia)

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
