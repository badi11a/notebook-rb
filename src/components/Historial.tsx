'use client';

import { useEffect, useState } from 'react';
import { getResumenMensual } from '@/lib/queries';
import { fmtM } from '@/lib/format';
import type { ResumenMensual } from '@/types';


function formatMes(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());
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

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
      Cargando…
    </div>
  );

  if (error) return (
    <div style={{ margin: '12px 0', padding: '12px 14px', background: 'var(--red-bg)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)', color: 'var(--red-text)' }}>
      {error}
    </div>
  );

  if (resumen.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
      Sin historial — ingresa snapshots en Entry
    </div>
  );

  const lista = [...resumen.slice(-12)].reverse();

  return (
    <div id="screen-historial" className="screen active">
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {lista.map((r, i) => {
          const prev = lista[i + 1];
          const delta = prev ? Number(r.neto) - Number(prev.neto) : null;
          const isLast = i === lista.length - 1;

          return (
            <div
              key={r.fecha}
              style={{
                padding: '14px 16px',
                borderBottom: isLast ? 'none' : '0.5px solid var(--border)',
              }}
            >
              {/* Fila superior: mes + net worth */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text)' }}>{formatMes(r.fecha)}</div>
                  {delta !== null && (
                    <div style={{
                      fontSize: 'var(--text-xs)',
                      marginTop: '2px',
                      color: delta >= 0 ? 'var(--green-text)' : 'var(--red-text)',
                    }}>
                      {delta >= 0 ? '▲' : '▼'} {fmtM(Math.abs(delta))} vs anterior
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '2px' }}>Net Worth</div>
                  <div style={{ fontSize: 'var(--text-2xl)', color: 'var(--green)', lineHeight: 1 }}>{fmtM(Number(r.neto))}</div>
                </div>
              </div>

              {/* Fila inferior: métricas secundarias 2x2 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {[
                  { label: 'Gross Assets', value: r.bruto,   color: 'var(--blue)'      },
                  { label: 'Liabilities',  value: r.pasivos, color: 'var(--red-text)'  },
                  { label: 'AUM',          value: r.aum,     color: 'var(--text)'      },
                  { label: 'Liquid',       value: r.liquido, color: 'var(--amber-text)'},
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</div>
                    <div style={{ fontSize: 'var(--text-base)', color }}>{fmtM(Number(value))}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
