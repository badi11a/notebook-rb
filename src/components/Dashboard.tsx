'use client';

import { useEffect, useState } from 'react';
import { getUltimoSnapshot, getTiposCambioRecientes, getResumenMensual } from '@/lib/queries';
import { fmtM } from '@/lib/format';
import type { SnapshotConActivo, TipoCambio, ResumenMensual } from '@/types';

const ESTRUCTURA_CONFIG: Record<string, { label: string; color: string }> = {
  'raices':      { label: 'Real Estate',      color: '#1D9E75' },
  'previsional': { label: 'Pension',           color: '#5DCAA5' },
  'etfs':        { label: 'ETFs',              color: '#378ADD' },
  'stocks':      { label: 'Equities',          color: '#E07B39' },
  'betterplan':  { label: 'Alternatives',      color: '#7F77DD' },
  'fondos':      { label: 'Mutual Funds',      color: '#BA7517' },
  'cuentas':     { label: 'Cash & Accounts',   color: '#4DB8A0' },
  'otros':       { label: 'Other Assets',      color: '#888780' },
  'pasivo':      { label: 'Total Liabilities', color: '#E24B4A' },
};

function getGrupoEstructura(s: SnapshotConActivo): string {
  const clase = (s.clase || '').toLowerCase();
  const cat   = (s.categoria || '').toLowerCase();
  const sub   = (s.subcategoria || '').toLowerCase();
  const inst  = (s.institucion || '').toLowerCase();
  if (clase.includes('pasivo')) return 'pasivo';
  if (cat.includes('fijo')) {
    if (sub.includes('propiedades')) return 'raices';
    if (sub.includes('afp') || sub.includes('apv')) return 'previsional';
  }
  if (inst.includes('betterplan')) return 'betterplan';
  if (sub.includes('etf'))                                              return 'etfs';
  if (sub.includes('acción') || sub.includes('accion'))                return 'stocks';
  if (cat.includes('fondo') || sub.includes('fondo'))                  return 'fondos';
  if (sub.includes('ahorro') || sub.includes('vista') || sub.includes('corriente')) return 'cuentas';
  return 'otros';
}


function fmtDelta(actual: number, anterior: number): JSX.Element {
  const v1 = Number(actual) || 0;
  const v2 = Number(anterior) || 0;
  const diff = v1 - v2;
  if (Math.abs(diff) < 1000) return <div className="metric-delta" style={{ color: 'var(--text-tertiary)' }}>— $0.0M</div>;
  const isPos = diff > 0;
  return (<div className="metric-delta" style={{ color: isPos ? 'var(--green-text)' : 'var(--red-text)' }}>{isPos ? '▲' : '▼'} {isPos ? '+' : ''}{fmtM(diff)}</div>);
}

function fmtNum(n: number): string { return (Number(n) || 0).toLocaleString('es-CL', { maximumFractionDigits: 0 }); }

function agruparEstructura(snapshots: SnapshotConActivo[]) {
  const grupos = new Map<string, { label: string; color: string; total: number; insts: Set<string> }>();
  const orden = ['raices', 'previsional', 'etfs', 'stocks', 'betterplan', 'fondos', 'cuentas', 'otros', 'pasivo'];
  orden.forEach(key => grupos.set(key, { ...ESTRUCTURA_CONFIG[key], total: 0, insts: new Set() }));
  for (const s of snapshots) {
    const key = getGrupoEstructura(s);
    const g = grupos.get(key);
    if (!g) continue;
    g.total += Number(s.valor_clp) || 0;
    g.insts.add(s.institucion === '(N/A)' ? s.nombre_producto : s.institucion);
  }
  return Array.from(grupos.values());
}

export default function Dashboard() {
  const [snapshots, setSnapshots] = useState<SnapshotConActivo[]>([]);
  const [historialResumen, setHistorialResumen] = useState<ResumenMensual[]>([]);
  const [tc, setTc] = useState<TipoCambio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getUltimoSnapshot(), getResumenMensual(), getTiposCambioRecientes()])
      .then(([snaps, resu, tipos]) => {
        setSnapshots(snaps);
        setHistorialResumen(resu);
        setTc(tipos);
      })
      .catch(e => { console.error(e); setError(e.message); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="screen active"><div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-tertiary)' }}>Loading…</div></div>;
  if (error) return <div className="screen active"><div style={{ padding: '20px', color: 'var(--red-text)' }}>Error: {error}</div></div>;

  const estructura = agruparEstructura(snapshots).sort((a, b) => {
    if (a.label === 'Total Liabilities') return 1;
    if (b.label === 'Total Liabilities') return -1;
    return b.total - a.total;
  });
  const getT = (key: string) => estructura.find(g => g.label === ESTRUCTURA_CONFIG[key]?.label)?.total ?? 0;

  const patrimonioBruto = snapshots.filter(s => getGrupoEstructura(s) !== 'pasivo').reduce((sum, s) => sum + (Number(s.valor_clp) || 0), 0);
  const pasivosTotales = snapshots.filter(s => getGrupoEstructura(s) === 'pasivo').reduce((sum, s) => sum + (Number(s.valor_clp) || 0), 0);
  const patrimonioNeto = patrimonioBruto - pasivosTotales;
  const aum = getT('etfs') + getT('stocks') + getT('betterplan') + getT('fondos') + getT('cuentas') + getT('otros');
  const liquido = aum - pasivosTotales;

  const deudaHipotecaria = snapshots.filter(s => (s.subcategoria || '').toLowerCase().includes('hipotecario')).reduce((sum, s) => sum + Number(s.valor_clp), 0);
  const pasivoCirculante = snapshots.filter(s => {
    const sub = (s.subcategoria || '').toLowerCase();
    return sub.includes('circulante') || sub.includes('tarjeta') || sub.includes('cheque');
  }).reduce((sum, s) => sum + Number(s.valor_clp), 0);
  const cajaPura = getT('cuentas');
  const bienesRaices = getT('raices');

  const actualRes = historialResumen[historialResumen.length - 1];
  const anteriorRes = historialResumen[historialResumen.length - 2];

  const institucionesAUM = new Set<string>();
  snapshots.forEach(s => {
    const cat = getGrupoEstructura(s);
    if (['etfs', 'stocks', 'betterplan', 'fondos', 'cuentas', 'otros'].includes(cat) && s.valor_clp > 0) {
      const inst = (s.institucion || '').toLowerCase();
      const esInst = !inst.includes('cash') && !inst.includes('honorarios') && !inst.includes('castro') && !inst.includes('badilla') && inst !== '(n/a)';
      if (esInst) institucionesAUM.add(s.institucion);
    }
  });

  return (
    <div id="screen-dashboard" className="screen active">
      <div className="metric-grid">
        <div className="metric">
          <div className="metric-label">Gross Assets</div>
          <div className="metric-value" style={{ color: 'var(--blue)' }}>{fmtM(patrimonioBruto)}</div>
          {actualRes && anteriorRes ? fmtDelta(actualRes.bruto, anteriorRes.bruto) : <div className="metric-delta">— $0.0M</div>}
        </div>
        <div className="metric">
          <div className="metric-label">Net Worth</div>
          <div className="metric-value" style={{ color: 'var(--green)' }}>{fmtM(patrimonioNeto)}</div>
          {actualRes && anteriorRes ? fmtDelta(actualRes.neto, anteriorRes.neto) : <div className="metric-delta">— $0.0M</div>}
        </div>
        <div className="metric">
          <div className="metric-label">AUM</div>
          <div className="metric-value">{fmtM(aum)}</div>
          {actualRes && anteriorRes ? fmtDelta(actualRes.aum, anteriorRes.aum) : <div className="metric-delta">— $0.0M</div>}
        </div>
        <div className="metric">
          <div className="metric-label">Liquid Assets</div>
          <div className="metric-value" style={{ color: 'var(--amber-text)' }}>{fmtM(liquido)}</div>
          {actualRes && anteriorRes ? fmtDelta(actualRes.liquido, anteriorRes.liquido) : <div className="metric-delta">— $0.0M</div>}
        </div>
      </div>

      <div className="section-label">Asset Allocation</div>
      <div className="card">
        {estructura.map(g => {
          const isPasivo = g.label === 'Total Liabilities';
          const totalActivos = estructura.filter(x => x.label !== 'Total Liabilities').reduce((s, x) => s + x.total, 0);
          const pct = totalActivos > 0 ? (g.total / totalActivos) * 100 : 0;
          return (
            <div key={g.label} className="asset-row">
              <div className="asset-dot" style={{ background: g.color }}></div>
              <div style={{ flex: 1 }}><div className="asset-name">{g.label}</div><div className="asset-inst">{Array.from(g.insts).slice(0, 4).join(' · ')}</div></div>
              <div className="asset-pct" style={{ color: isPasivo ? 'var(--red-text)' : 'inherit' }}>{isPasivo ? '-' : ''}{pct.toFixed(1).replace('.', ',')}%</div>
              <div className="asset-val" style={{ color: isPasivo ? 'var(--red-text)' : 'inherit' }}>{isPasivo ? '-' : ''}{fmtM(g.total)}</div>
            </div>
          );
        })}
      </div>

      <div className="section-label">Financial Ratios</div>
      <div className="metric-grid">
        <div className="metric">
          <div className="metric-label">Debt-to-Assets</div>
          <div className="metric-value" style={{ fontSize: 'var(--text-base)' }}>{patrimonioBruto > 0 ? ((pasivosTotales / patrimonioBruto) * 100).toFixed(1) : 0}%</div>
          <div className="metric-delta">Leverage</div>
        </div>
        <div className="metric">
          <div className="metric-label">Mortgage Coverage</div>
          <div className="metric-value" style={{ fontSize: 'var(--text-base)' }}>{deudaHipotecaria > 0 ? (bienesRaices / deudaHipotecaria).toFixed(2) : 0}x</div>
          <div className="metric-delta">Real Estate / Mortgage</div>
        </div>
        <div className="metric">
          <div className="metric-label">Quick Ratio</div>
          <div className="metric-value" style={{ fontSize: 'var(--text-base)' }}>{pasivoCirculante > 0 ? (cajaPura / pasivoCirculante).toFixed(1) : 0}x</div>
          <div className="metric-delta">Cash / Current Liab.</div>
        </div>
        <div className="metric">
          <div className="metric-label">Solvency Ratio</div>
          <div className="metric-value" style={{ fontSize: 'var(--text-base)' }}>{patrimonioBruto > 0 ? ((patrimonioNeto / patrimonioBruto) * 100).toFixed(1) : 0}%</div>
          <div className="metric-delta">Real Equity</div>
        </div>
      </div>

      <div className="section-label">Exchange Rates</div>
      <div className="metric-grid metric-grid-3">
        <div className="metric"><div className="metric-label">UF</div><div className="metric-value" style={{ fontSize: 'var(--text-base)' }}>{tc ? `$${fmtNum(tc.uf)}` : '—'}</div></div>
        <div className="metric"><div className="metric-label">USD/CLP</div><div className="metric-value" style={{ fontSize: 'var(--text-base)' }}>{tc ? `$${fmtNum(tc.usd)}` : '—'}</div></div>
        <div className="metric"><div className="metric-label">UTM</div><div className="metric-value" style={{ fontSize: 'var(--text-base)' }}>{tc ? `$${fmtNum(tc.utm)}` : '—'}</div></div>
      </div>
    </div>
  );
}
