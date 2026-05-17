'use client';

import { useEffect, useState } from 'react';
import {
  getActivosActivos,
  getUltimoSnapshot,
  getTiposCambioRecientes,
  insertSnapshot,
  insertTipoCambio,
} from '@/lib/queries';
import type { Activo, SnapshotConActivo } from '@/types';

function parseNum(s: string): number {
  // Soporta formato CLP: "40.134" → 40134  y  "906,77" → 906.77
  return parseFloat(s.trim().replace(/\./g, '').replace(',', '.')) || 0;
}

function fmtM(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

const CLASE_ORDEN = ['Caja', 'ETF', 'Acción', 'Fondo mutuo', 'Alternativo', 'Previsional'];

export default function Captura() {
  const hoy = new Date().toISOString().split('T')[0];

  const [activos, setActivos]       = useState<Activo[]>([]);
  const [prevSnaps, setPrevSnaps]   = useState<Map<string, SnapshotConActivo>>(new Map());
  const [fecha, setFecha]           = useState(hoy);
  const [uf, setUf]                 = useState('');
  const [usd, setUsd]               = useState('');
  const [utm, setUtm]               = useState('');
  const [valores, setValores]       = useState<Record<string, string>>({});
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState<string | null>(null);
  const [loadError, setLoadError]   = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getActivosActivos(), getUltimoSnapshot(), getTiposCambioRecientes()])
      .then(([acts, snaps, tc]) => {
        setActivos(acts);
        setPrevSnaps(new Map(snaps.map(s => [s.activo_id, s])));
        if (tc) {
          setUf(String(tc.uf));
          setUsd(String(tc.usd));
          setUtm(String(tc.utm));
        }
      })
      .catch(e => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function setValor(id: string, v: string) {
    setValores(prev => ({ ...prev, [id]: v }));
  }

  async function guardar() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const ufN  = parseNum(uf);
      const usdN = parseNum(usd);
      const utmN = parseNum(utm);

      if (ufN && usdN && utmN) {
        await insertTipoCambio(fecha, ufN, usdN, utmN);
      }

      let count = 0;
      for (const activo of activos) {
        const raw = valores[activo.id]?.trim();
        if (!raw) continue;
        const valorOriginal = parseNum(raw);
        if (!valorOriginal) continue;

        let tc = 1;
        if (activo.moneda_base === 'UF')  tc = ufN;
        if (activo.moneda_base === 'USD') tc = usdN;
        if (activo.moneda_base === 'UTM') tc = utmN;

        await insertSnapshot(activo.id, fecha, valorOriginal, tc, valorOriginal * tc);
        count++;
      }

      setSaveMsg(`✓ ${count} snapshot${count !== 1 ? 's' : ''} guardados`);
      setValores({});

      // Refrescar prevSnaps
      const snaps = await getUltimoSnapshot();
      setPrevSnaps(new Map(snaps.map(s => [s.activo_id, s])));
    } catch (e: any) {
      setSaveMsg(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  // Agrupar activos por clase
  const porClase = CLASE_ORDEN.reduce<Record<string, Activo[]>>((acc, clase) => {
    const group = activos.filter(a => a.clase === clase);
    if (group.length > 0) acc[clase] = group;
    return acc;
  }, {});
  // Clases no contempladas en CLASE_ORDEN
  for (const a of activos) {
    if (!CLASE_ORDEN.includes(a.clase) && !porClase[a.clase]) {
      porClase[a.clase] = activos.filter(x => x.clase === a.clase);
    }
  }

  if (loading) return (
    <div id="screen-captura" className="screen active">
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)', fontSize: '13px' }}>
        Cargando…
      </div>
    </div>
  );

  if (loadError) return (
    <div id="screen-captura" className="screen active">
      <div style={{ margin: '12px 0', padding: '12px 14px', background: 'var(--red-bg)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--red-text)' }}>
        {loadError}
      </div>
    </div>
  );

  return (
    <div id="screen-captura" className="screen active">

      {/* ── fecha ── */}
      <div className="section-label">Fecha del snapshot</div>
      <div className="card">
        <div className="inp-row" style={{ borderBottom: 'none' }}>
          <div className="inp-label">Fecha</div>
          <input
            type="date"
            className="inp-field"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            style={{ width: '140px' }}
          />
        </div>
      </div>

      {/* ── tipos de cambio ── */}
      <div className="section-label">Tipos de cambio</div>
      <div className="tc-grid">
        <div className="tc-card">
          <div className="tc-label">UF</div>
          <input
            className="inp-field"
            style={{ width: '100%', marginTop: '2px' }}
            placeholder="40134"
            value={uf}
            onChange={e => setUf(e.target.value)}
          />
        </div>
        <div className="tc-card">
          <div className="tc-label">USD/CLP</div>
          <input
            className="inp-field"
            style={{ width: '100%', marginTop: '2px' }}
            placeholder="906,77"
            value={usd}
            onChange={e => setUsd(e.target.value)}
          />
        </div>
        <div className="tc-card">
          <div className="tc-label">UTM</div>
          <input
            className="inp-field"
            style={{ width: '100%', marginTop: '2px' }}
            placeholder="70588"
            value={utm}
            onChange={e => setUtm(e.target.value)}
          />
        </div>
      </div>

      {/* ── activos por clase ── */}
      {Object.entries(porClase).map(([clase, acts]) => (
        <div key={clase}>
          <div className="section-label">{clase}</div>
          <div className="card">
            {acts.map((activo, i) => {
              const prev = prevSnaps.get(activo.id);
              const prevDisplay = prev ? fmtM(prev.valor_clp) : '—';
              const isLast = i === acts.length - 1;
              return (
                <div
                  key={activo.id}
                  className="inp-row"
                  style={isLast ? { borderBottom: 'none' } : undefined}
                >
                  <div className="inp-label" style={{ lineHeight: 1.3 }}>
                    {activo.nombre_producto}
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                      {activo.institucion}
                      {activo.ticker ? ` · ${activo.ticker}` : ''}
                    </div>
                  </div>
                  <div className="inp-prev">{prevDisplay}</div>
                  <input
                    className="inp-field"
                    placeholder={activo.moneda_base}
                    value={valores[activo.id] ?? ''}
                    onChange={e => setValor(activo.id, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ── feedback ── */}
      {saveMsg && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          marginBottom: '4px',
          background: saveMsg.startsWith('Error') ? 'var(--red-bg)' : 'var(--green-bg)',
          color: saveMsg.startsWith('Error') ? 'var(--red-text)' : 'var(--green-text)',
        }}>
          {saveMsg}
        </div>
      )}

      <button
        className="save-btn"
        onClick={guardar}
        disabled={saving}
        style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
      >
        <i className="ti ti-device-floppy" style={{ fontSize: '15px', verticalAlign: '-2px', marginRight: '6px' }}></i>
        {saving ? 'Guardando…' : 'Guardar snapshot'}
      </button>

    </div>
  );
}
