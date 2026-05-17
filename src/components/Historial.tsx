'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getResumenMensual } from '@/lib/queries';
import type { ResumenMensual } from '@/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmtM(n: number): string {
  const absN = Math.round(Math.abs(n));
  const sign = n < 0 ? '-' : '';
  if (absN >= 1_000_000) return `${sign}$${(absN / 1_000_000).toFixed(1)}M`;
  if (absN >= 1_000)     return `${sign}$${Math.round(absN / 1_000)}k`;
  return `${sign}$${absN}`;
}

function formatMes(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const mes = d.toLocaleDateString('es-CL', { month: 'long' });
  return `${mes.charAt(0).toUpperCase() + mes.slice(1)} ${d.getFullYear()}`;
}

function mesCorto(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return MESES_CORTO[d.getMonth()];
}

export default function Historial() {
  const [resumen, setResumen] = useState<ResumenMensual[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getResumenMensual()
      .then(setResumen)
      .catch(() => setError('Error al cargar el historial'))
      .finally(() => setLoading(false));
  }, []);

  const ultimos12 = resumen.slice(-12);

  const chartData = {
    labels: ultimos12.map(r => mesCorto(r.fecha)),
    datasets: [
      { label: 'Neto',    data: ultimos12.map(r => Number(r.neto)    / 1_000_000), borderColor: '#1D9E75', backgroundColor: 'rgba(29, 158, 117, 0.2)',  fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2 },
      { label: 'Bruto',   data: ultimos12.map(r => Number(r.bruto)   / 1_000_000), borderColor: '#378ADD', backgroundColor: 'rgba(55, 138, 221, 0.05)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5, borderDash: [4, 4] },
      { label: 'AUM',     data: ultimos12.map(r => Number(r.aum)     / 1_000_000), borderColor: '#888780', tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
      { label: 'Líquido', data: ultimos12.map(r => Number(r.liquido) / 1_000_000), borderColor: '#BA7517', tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
      { label: 'Pasivos', data: ultimos12.map(r => Number(r.pasivos) / 1_000_000), borderColor: '#E24B4A', tension: 0.4, pointRadius: 0, borderWidth: 1.5, borderDash: [2, 3] },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index' as const, intersect: false, callbacks: { label: (ctx: any) => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(1)}M` } },
    },
    scales: {
      y: { beginAtZero: false, ticks: { callback: (v: any) => `$${v}M`, font: { size: 9 }, color: '#9a9a94' }, grid: { color: 'rgba(128,128,128,.06)' } },
      x: { ticks: { font: { size: 9 }, color: '#9a9a94' }, grid: { display: false } },
    },
  };

  const lista = [...ultimos12].reverse();

  return (
    <div id="screen-historial" className="screen active">
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          Cargando…
        </div>
      ) : error ? (
        <div style={{ margin: '12px 0', padding: '12px 14px', background: 'var(--red-bg)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--red-text)' }}>
          {error}
        </div>
      ) : resumen.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          Sin historial — ingresa snapshots en Captura
        </div>
      ) : (
        <>
          <div className="chart-wrap" style={{ height: '200px' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
          <div className="legend" style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px 12px' }}>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#1D9E75' }}></span>Neto</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#378ADD' }}></span>Bruto</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#888780' }}></span>AUM</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#BA7517' }}></span>Líquido</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#E24B4A' }}></span>Pasivos</span>
          </div>

          <div className="section-label">Historial mensual</div>
          <div className="card">
            {lista.map((r, i) => {
              const isLast = i === lista.length - 1;
              return (
                <div key={r.fecha} style={{
                  padding: '10px 0',
                  borderBottom: isLast ? 'none' : '0.5px solid var(--border)',
                }}>
                  <div className="snap-date" style={{ marginBottom: '8px' }}>{formatMes(r.fecha)}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                    {[
                      { label: 'Bruto',   value: r.bruto,   color: 'var(--blue)'         },
                      { label: 'Pasivos', value: r.pasivos, color: 'var(--red-text)'     },
                      { label: 'Neto',    value: r.neto,    color: 'var(--green)'        },
                      { label: 'AUM',     value: r.aum,     color: 'var(--text-primary)' },
                      { label: 'Líquido', value: r.liquido, color: 'var(--amber-text)'   },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '8px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>{label}</div>
                        <div style={{ fontSize: '10px', fontWeight: '600', color }}>{fmtM(Number(value))}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
