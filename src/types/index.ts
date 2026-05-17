export interface Activo {
  id: string
  usuario_id: string
  clase: string
  categoria: string
  subcategoria: string | null
  institucion: string
  nombre_producto: string
  moneda_base: string
  ticker: string | null
  estado: 'activo' | 'inactivo'
  created_at: string
}

export interface Snapshot {
  id: string
  activo_id: string
  fecha: string
  valor_original: number
  tipo_cambio_clp: number
  valor_clp: number
  created_at: string
}

export interface SnapshotConActivo extends Snapshot {
  nombre_producto: string
  institucion: string
  clase: string
  categoria: string
  subcategoria: string | null
  moneda_base: string
  ticker: string | null
}

export interface TipoCambio {
  fecha: string
  uf: number
  usd: number
  utm: number
  created_at: string
}

export interface HistorialFecha {
  fecha: string
  total_clp: number
}

export interface ResumenMensual {
  id: string
  usuario_id: string
  fecha: string
  bruto: number
  neto: number
  aum: number
  liquido: number
  pasivos: number
  created_at: string
}
