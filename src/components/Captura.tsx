'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getActivosActivos,
  getActivosInactivos,
  getSnapshotsPorFecha,
  getSnapshotsPrevios,
  getTiposCambioPorFecha,
  getTiposCambioRecientes,
  insertSnapshot,
  insertTipoCambio,
  updateActivoEstado,
  createActivo,
  syncResumenMensual,
} from '@/lib/queries';
import { fmtM } from '@/lib/format';
import type { Activo, SnapshotConActivo } from '@/types';

function parseNum(s: string): number {
  s = s.trim();
  if (!s) return 0;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
    }
    return parseFloat(s.replace(/,/g, '')) || 0;
  }
  if (hasComma) {
    return parseFloat(s.replace(',', '.')) || 0;
  }
  if (hasDot) {
    return parseFloat(s.replace(/\./g, '')) || 0;
  }
  return parseFloat(s) || 0;
}

function fmtInput(n: number): string {
  if (n === 0) return '0';
  const intStr = Math.floor(Math.abs(n)).toString();
  const decStr = n.toString().includes('.') ? n.toString().split('.')[1] : '';
  const withDots = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (!decStr || /^0+$/.test(decStr)) return (n < 0 ? '-' : '') + withDots;
  return (n < 0 ? '-' : '') + withDots + ',' + decStr;
}


const GRUPO_LABELS: Record<string, string> = {
  'etfs':         'ETFs',
  'stocks':       'Stocks',
  'alternativos': 'Alternativos',
  'fondos':       'Fondos Mutuos',
  'cuentas':      'Cuentas',
  'previsional':  'Previsional',
  'pasivo':       'Pasivo',
  'otros':        'Otros',
};

const GRUPO_ORDEN = ['etfs', 'stocks', 'alternativos', 'fondos', 'cuentas', 'previsional', 'pasivo', 'otros'];

function getGrupoCaptura(a: Activo): string {
  const cat  = (a.categoria || '').toLowerCase();
  const sub  = (a.subcategoria || '').toLowerCase();
  const inst = (a.institucion || '').toLowerCase();
  const clase = (a.clase || '').toLowerCase();

  if (clase === 'pasivo')                      return 'pasivo';
  if (clase === 'previsional')                 return 'previsional';
  if (inst.includes('betterplan'))             return 'alternativos';
  if (sub.includes('etf'))                     return 'etfs';
  if (sub.includes('acción') || sub.includes('accion')) return 'stocks';
  if (cat.includes('fondo') || sub.includes('fondo'))   return 'fondos';
  if (sub.includes('ahorro') || sub.includes('vista') || sub.includes('corriente')) return 'cuentas';
  return 'otros';
}

export default function Captura() {
  const hoy = new Date().toISOString().split('T')[0];

  const [activos, setActivos]       = useState<Activo[]>([]);
  const [inactivos, setInactivos]   = useState<Activo[]>([]);
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
  const [hasExistingData, setHasExistingData] = useState(false);
  const [showInactivos, setShowInactivos] = useState(false);
  const [showNewForm, setShowNewForm]   = useState(false);
  const [newFormError, setNewFormError] = useState<string | null>(null);
  const [newForm, setNewForm]           = useState({
    clase: 'Acción', categoria: 'Inversiones financieras', subcategoria: '', institucion: '',
    nombre_producto: '', moneda_base: 'CLP', ticker: '',
  });

  const mesActual = hoy.substring(0, 7);
  const mesSeleccionado = fecha.substring(0, 7);
  const isCurrentMonth = mesSeleccionado === mesActual;

  const cargarDatos = useCallback(async (fechaSel: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const [acts, snapsFecha, snapsPrev, tcFecha, tcRecent, inacts] = await Promise.all([
        getActivosActivos(),
        getSnapshotsPorFecha(fechaSel),
        getSnapshotsPrevios(fechaSel),
        getTiposCambioPorFecha(fechaSel),
        getTiposCambioRecientes(),
        getActivosInactivos(),
      ]);

      setActivos(acts);
      setInactivos(inacts);
      setPrevSnaps(new Map(snapsPrev.map(s => [s.activo_id, s])));

      const tc = tcFecha || tcRecent;
      if (tc) {
        setUf(fmtInput(tc.uf));
        setUsd(fmtInput(tc.usd));
        setUtm(fmtInput(tc.utm));
      } else {
        setUf('');
        setUsd('');
        setUtm('');
      }

      const snapMap = new Map(snapsFecha.map(s => [s.activo_id, s]));
      setHasExistingData(snapsFecha.length > 0);

      const prefill: Record<string, string> = {};
      for (const activo of acts) {
        const snap = snapMap.get(activo.id);
        if (snap) {
          prefill[activo.id] = fmtInput(snap.valor_original);
        }
      }
      setValores(prefill);
    } catch (e: any) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos(fecha);
  }, [fecha, cargarDatos]);

  function setValor(id: string, v: string) {
    setValores(prev => ({ ...prev, [id]: v }));
  }

  async function toggleEstado(id: string, nuevoEstado: 'activo' | 'inactivo') {
    await updateActivoEstado(id, nuevoEstado);
    await cargarDatos(fecha);
  }

  async function crearActivo() {
    if (!newForm.nombre_producto.trim() || !newForm.institucion.trim()) return;
    setNewFormError(null);
    try {
      await createActivo({
        clase: newForm.clase,
        categoria: newForm.categoria || newForm.clase,
        subcategoria: newForm.subcategoria.trim() || null,
        institucion: newForm.institucion.trim(),
        nombre_producto: newForm.nombre_producto.trim(),
        moneda_base: newForm.moneda_base,
        ticker: newForm.ticker.trim() || null,
      });
      setShowNewForm(false);
      setNewForm({ clase: 'Acción', categoria: 'Inversiones financieras', subcategoria: '', institucion: '', nombre_producto: '', moneda_base: 'CLP', ticker: '' });
      await cargarDatos(fecha);
    } catch (e: any) {
      setNewFormError(e.message || 'Error al crear el activo');
    }
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
        if (raw === '' || raw === undefined || raw === null) continue;
        const valorOriginal = parseNum(raw);
        if (valorOriginal < 0) continue;

        let tc = 1;
        const m = (activo.moneda_base || '').toUpperCase();
        if (m === 'UF')  tc = ufN;
        if (m === 'USD') tc = usdN;
        if (m === 'UTM') tc = utmN;
        if (tc === 0) continue;

        await insertSnapshot(activo.id, fecha, valorOriginal, tc, valorOriginal * tc);
        count++;
      }

      setSaveMsg(`✓ ${count} snapshot${count !== 1 ? 's' : ''} guardados`);
      await syncResumenMensual();
      await cargarDatos(fecha);
    } catch (e: any) {
      console.error('[captura save]', e);
      setSaveMsg('Error al guardar. Verifica los datos e intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  const porClase: Record<string, Activo[]> = {};
  for (const grupo of GRUPO_ORDEN) {
    porClase[grupo] = [];
  }
  for (const a of activos) {
    const g = getGrupoCaptura(a);
    if (!porClase[g]) porClase[g] = [];
    porClase[g].push(a);
  }
  for (const grupo of GRUPO_ORDEN) {
    if (porClase[grupo].length === 0) delete porClase[grupo];
  }

  if (loading) return (
    <div id="screen-captura" className="screen active">
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
        Cargando…
      </div>
    </div>
  );

  if (loadError) return (
    <div id="screen-captura" className="screen active">
      <div style={{ margin: '12px 0', padding: '12px 14px', background: 'var(--red-bg)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)', color: 'var(--red-text)' }}>
        {loadError}
      </div>
    </div>
  );

  return (
    <div id="screen-captura" className="screen active">

      <div className="section-label">Fecha del snapshot</div>
      <div className="card">
        <div className="inp-row" style={{ borderBottom: 'none', alignItems: 'center', gap: '12px' }}>
          <div className="inp-label">
            Fecha
            {hasExistingData && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--amber-text)', marginLeft: '8px', fontWeight: 'normal' }}>
                actualizando
              </span>
            )}
          </div>
          <input
            type="date"
            className="inp-field"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            style={{ width: '140px' }}
          />
        </div>
      </div>

      <div className="section-label">Tipos de cambio</div>

      {!isCurrentMonth && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-sm)',
          marginBottom: '12px',
          background: 'var(--amber-bg)',
          color: 'var(--amber-text)',
        }}>
          <i className="ti ti-lock" style={{ fontSize: 'var(--text-base)', verticalAlign: '-2px', marginRight: '6px' }}></i>
          Solo puedes editar snapshots del mes actual. Este mes está en modo consulta.
        </div>
      )}

      <div className="tc-grid">
        <div className="tc-card">
          <div className="tc-label">UF</div>
          <input
            className="inp-field"
            style={{ width: '100%', marginTop: '2px' }}
            placeholder="40134"
            value={uf}
            onChange={e => setUf(e.target.value)}
            disabled={!isCurrentMonth}
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
            disabled={!isCurrentMonth}
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
            disabled={!isCurrentMonth}
          />
        </div>
      </div>

      {Object.entries(porClase).map(([grupo, acts]) => (
        <div key={grupo}>
          <div className="section-label">{GRUPO_LABELS[grupo] || grupo}</div>
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
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '1px' }}>
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
                    disabled={!isCurrentMonth}
                  />
                  <button
                    onClick={() => toggleEstado(activo.id, 'inactivo')}
                    title="Mover a inactivos"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-tertiary)',
                      padding: '2px 4px',
                      fontSize: 'var(--text-base)',
                      lineHeight: 1,
                    }}
                  >
                    <i className="ti ti-eye-off"></i>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {inactivos.length > 0 && (
        <div style={{ marginTop: '4px' }}>
          <button
            onClick={() => setShowInactivos(!showInactivos)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Inactivos ({inactivos.length})</span>
            <i className={`ti ti-chevron-${showInactivos ? 'up' : 'down'}`} style={{ fontSize: 'var(--text-base)' }}></i>
          </button>

          {showInactivos && (
            <div style={{ marginTop: '8px' }}>
              {GRUPO_ORDEN.map(grupo => {
                const items = inactivos.filter(a => getGrupoCaptura(a) === grupo);
                if (items.length === 0) return null;
                return (
                  <div key={grupo}>
                    <div className="section-label" style={{ opacity: 0.5 }}>{GRUPO_LABELS[grupo] || grupo}</div>
                    <div className="card" style={{ opacity: 0.5 }}>
                      {items.map((activo, i) => {
                        const isLast = i === items.length - 1;
                        return (
                          <div
                            key={activo.id}
                            className="inp-row"
                            style={isLast ? { borderBottom: 'none' } : undefined}
                          >
                            <div className="inp-label" style={{ lineHeight: 1.3 }}>
                              {activo.nombre_producto}
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                                {activo.institucion}
                                {activo.ticker ? ` · ${activo.ticker}` : ''}
                              </div>
                            </div>
                            <div className="inp-prev" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>—</div>
                            <input
                              className="inp-field"
                              placeholder={activo.moneda_base}
                              disabled
                              style={{ opacity: 0.45 }}
                            />
                            <button
                              onClick={() => toggleEstado(activo.id, 'activo')}
                              title="Mover a activos"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-tertiary)',
                                padding: '2px 4px',
                                fontSize: 'var(--text-base)',
                                lineHeight: 1,
                              }}
                            >
                              <i className="ti ti-eye"></i>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <button
        className="ia-btn"
        onClick={() => setShowNewForm(!showNewForm)}
        style={{ marginTop: showNewForm ? '0' : '20px' }}
      >
        <i className="ti ti-plus" style={{ marginRight: '6px', fontSize: 'var(--text-base)', verticalAlign: '-2px' }}></i>
        {showNewForm ? 'Cancelar' : 'Nuevo activo'}
      </button>

      {showNewForm && (
        <div className="card" style={{ marginTop: '12px' }}>
          <div className="inp-row">
            <div className="inp-label">Nombre</div>
            <input className="inp-field" style={{ width: '100%', textAlign: 'left' }} placeholder="ej: AAPL" value={newForm.nombre_producto} onChange={e => setNewForm(f => ({ ...f, nombre_producto: e.target.value }))} />
          </div>
          <div className="inp-row">
            <div className="inp-label">Institución</div>
            <input className="inp-field" style={{ width: '100%', textAlign: 'left' }} placeholder="ej: Racional" value={newForm.institucion} onChange={e => setNewForm(f => ({ ...f, institucion: e.target.value }))} />
          </div>
          <div className="inp-row">
            <div className="inp-label">Clase</div>
            <select className="inp-field" style={{ width: '100%', textAlign: 'left' }} value={newForm.clase} onChange={e => setNewForm(f => ({ ...f, clase: e.target.value, categoria: e.target.value === 'Pasivo' ? 'Deuda' : f.categoria }))}>
              <option>Acción</option>
              <option>ETF</option>
              <option>Fondo mutuo</option>
              <option>Alternativo</option>
              <option>Caja</option>
              <option>Previsional</option>
              <option>Pasivo</option>
            </select>
          </div>
          <div className="inp-row">
            <div className="inp-label">Subcategoría</div>
            <input className="inp-field" style={{ width: '100%', textAlign: 'left' }} placeholder="ej: Acción US" value={newForm.subcategoria} onChange={e => setNewForm(f => ({ ...f, subcategoria: e.target.value }))} />
          </div>
          <div className="inp-row">
            <div className="inp-label">Moneda</div>
            <select className="inp-field" style={{ width: '100%', textAlign: 'left' }} value={newForm.moneda_base} onChange={e => setNewForm(f => ({ ...f, moneda_base: e.target.value }))}>
              <option>CLP</option>
              <option>USD</option>
              <option>UF</option>
              <option>UTM</option>
            </select>
          </div>
          <div className="inp-row" style={{ borderBottom: 'none' }}>
            <div className="inp-label">Ticker (opcional)</div>
            <input className="inp-field" style={{ width: '100%', textAlign: 'left' }} placeholder="ej: AAPL" value={newForm.ticker} onChange={e => setNewForm(f => ({ ...f, ticker: e.target.value }))} />
          </div>
          {newFormError && (
            <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)', background: 'var(--red-bg)', color: 'var(--red-text)', marginTop: '8px' }}>
              {newFormError}
            </div>
          )}
          <button
            className="save-btn"
            onClick={crearActivo}
            disabled={!newForm.nombre_producto.trim() || !newForm.institucion.trim()}
            style={{ marginTop: '12px', opacity: !newForm.nombre_producto.trim() || !newForm.institucion.trim() ? 0.5 : 1 }}
          >
            Crear activo
          </button>
        </div>
      )}

      {saveMsg && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-sm)',
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
        disabled={saving || !isCurrentMonth}
        style={{
          opacity: saving || !isCurrentMonth ? 0.6 : 1,
          cursor: saving || !isCurrentMonth ? 'not-allowed' : 'pointer',
          background: !isCurrentMonth ? 'var(--text-tertiary)' : undefined,
        }}
      >
        <i className="ti ti-device-floppy" style={{ fontSize: 'var(--text-base)', verticalAlign: '-2px', marginRight: '6px' }}></i>
        {saving ? 'Guardando…' : !isCurrentMonth ? 'Mes bloqueado' : hasExistingData ? 'Actualizar snapshot' : 'Guardar snapshot'}
      </button>

    </div>
  );
}
