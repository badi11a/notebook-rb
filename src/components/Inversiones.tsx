'use client';

import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { getSnapshotsComparativa } from '@/lib/queries';
import { fmtM } from '@/lib/format';
import type { SnapshotConActivo } from '@/types';

ChartJS.register(ArcElement, Tooltip, Legend);

const GRUPO_INVEST_CONFIG: Record<string, { label: string; color: string; order: number }> = {
  'etfs':         { label: 'ETFs',          color: '#378ADD', order: 1 },
  'stocks':       { label: 'Stocks',        color: '#E24B4A', order: 2 },
  'betterplan':   { label: 'Alternativos',   color: '#7F77DD', order: 3 },
  'fondos':       { label: 'Fondos Mutuos', color: '#BA7517', order: 4 },
  'cuentas':      { label: 'Cuentas',       color: '#5DCAA5', order: 5 },
  'otros':        { label: 'Otros',         color: '#888780', order: 6 },
};

function getGrupoInvest(s: SnapshotConActivo): string {
  const cat = (s.categoria || '').toLowerCase();
  const sub = (s.subcategoria || '').toLowerCase();
  const inst = (s.institucion || '').toLowerCase();
  if (inst.includes('betterplan')) return 'betterplan';
  if (sub.includes('etf')) return 'etfs';
  if (sub.includes('acción') || sub.includes('accion')) return 'stocks';
  if (cat.includes('fondo') || sub.includes('fondo')) return 'fondos';
  if (sub.includes('ahorro') || sub.includes('vista') || sub.includes('corriente')) return 'cuentas';
  return 'otros';
}


export default function Inversiones() {
  const [data, setData] = useState<{ actual: SnapshotConActivo[], anterior: SnapshotConActivo[] }>({ actual: [], anterior: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSnapshotsComparativa().then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const snapshots = data.actual;
  const snapshotsPrev = data.anterior;

  const snapshotsAUM = snapshots.filter(s => {
    const clase = (s.clase || '').toLowerCase();
    const cat = (s.categoria || '').toLowerCase();
    const sub = (s.subcategoria || '').toLowerCase();
    const esNoInversion = clase.includes('pasivo') || sub.includes('propiedades') || sub.includes('afp') || sub.includes('apv') || cat.includes('fijo');
    return !esNoInversion;
  });

  const totalAUM = snapshotsAUM.reduce((sum, s) => sum + (Number(s.valor_clp) || 0), 0);

  const investMap = new Map<string, { label: string; color: string; total: number; assets: (SnapshotConActivo & { deltaPct?: number })[] }>();
  Object.entries(GRUPO_INVEST_CONFIG).forEach(([key, cfg]) => {
    investMap.set(key, { label: cfg.label, color: cfg.color, total: 0, assets: [] });
  });

  const prevMap = new Map(snapshotsPrev.map(p => [p.activo_id, p]));

  snapshotsAUM.forEach(s => {
    const key = getGrupoInvest(s);
    const g = investMap.get(key);
    if (g) {
      g.total += Number(s.valor_clp) || 0;
      const prev = prevMap.get(s.activo_id);
      let deltaPct: number | undefined;
      if (prev && prev.valor_clp > 0) deltaPct = ((s.valor_clp / prev.valor_clp) - 1) * 100;
      g.assets.push({ ...s, deltaPct });
    }
  });

  const grupos = Array.from(investMap.values()).filter(g => g.assets.length > 0);

  const chartData = {
    labels: grupos.map(g => g.label),
    datasets: [{ data: grupos.map(g => g.total / 1_000_000), backgroundColor: grupos.map(g => g.color), borderWidth: 3, borderColor: '#fff' }],
  };

  if (loading) return <div className="screen active"><div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-tertiary)' }}>Cargando…</div></div>;
  if (error) return <div className="screen active"><div style={{ padding: '20px', color: 'var(--red-text)' }}>Error al cargar inversiones</div></div>;

  if (grupos.length === 0) return (
    <div className="screen active">
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
        Sin datos de inversión — ingresa snapshots en Entry
      </div>
    </div>
  );

  return (
    <div id="screen-inversiones" className="screen active">
      <div className="donut-wrap" style={{ height: '180px', marginBottom: '10px' }}>
        <Doughnut data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '65%' }} />
      </div>
      
      <div className="donut-legend" style={{ marginBottom: '25px', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
        {grupos.map((g) => (
          <span key={g.label} className="donut-item" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            <span className="donut-dot" style={{ width: '7px', height: '7px', borderRadius: '2px', background: g.color }}></span>
            {g.label} {fmtM(g.total)}
          </span>
        ))}
      </div>

      {grupos.map(g => (
        <div key={g.label}>
          <div className="section-label">{g.label}</div>
          <div className="card">
            {[...g.assets]
              .sort((a, b) => b.valor_clp - a.valor_clp)
              .map(s => {
                const pct = totalAUM > 0 ? (s.valor_clp / totalAUM * 100) : 0;
                const isCuenta = g.label === 'Cuentas';
                const isOtros  = g.label === 'Otros';
                const titulo   = (isCuenta || isOtros) ? s.institucion : (s.ticker?.toUpperCase() || 'S/T');
                const subtitulo = (isCuenta || isOtros) ? (s.subcategoria || s.nombre_producto) : s.nombre_producto;

                return (
                  <div key={s.id} className="asset-row">
                    <div className="asset-dot" style={{ background: g.color }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="asset-name" style={{ fontWeight: 'bold', textTransform: (isCuenta || isOtros) ? 'capitalize' : 'none' }}>{titulo}</div>
                      <div className="asset-inst" style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>{subtitulo}</div>
                      {!isCuenta && !isOtros && s.deltaPct !== undefined && (
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: s.deltaPct >= 0 ? 'var(--green-text)' : 'var(--red-text)', marginTop: '2px' }}>
                          {s.deltaPct >= 0 ? '▲' : '▼'} {Math.abs(s.deltaPct).toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="asset-val" style={{ fontWeight: '500' }}>{fmtM(s.valor_clp)}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{pct.toFixed(1).replace('.', ',')}%</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
