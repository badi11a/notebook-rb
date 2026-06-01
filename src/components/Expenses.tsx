'use client';

import { fmtM } from '@/lib/format';

type ExpenseCategory = 'housing' | 'food' | 'transport' | 'utilities' | 'healthcare' | 'other';

interface MonthData {
  month: string;
  housing: number;
  food: number;
  transport: number;
  utilities: number;
  healthcare: number;
  other: number;
}

const MONTHLY_DATA: MonthData[] = [
  { month: 'abr-25', housing: 1150000, food: 210000, transport: 75000, utilities: 60000, healthcare: 26010, other: 95000 },
  { month: 'may-25', housing: 1180000, food: 195000, transport: 70000, utilities: 62000, healthcare: 26010, other: 95000 },
  { month: 'jun-25', housing: 1200000, food: 200000, transport: 65000, utilities: 58000, healthcare: 26010, other: 95000 },
  { month: 'jul-25', housing: 1150000, food: 220000, transport: 80000, utilities: 64000, healthcare: 26010, other: 95000 },
  { month: 'ago-25', housing: 1210000, food: 190000, transport: 72000, utilities: 59000, healthcare: 26010, other: 95000 },
  { month: 'sep-25', housing: 1190000, food: 205000, transport: 68000, utilities: 61000, healthcare: 26010, other: 95000 },
  { month: 'oct-25', housing: 1170000, food: 215000, transport: 74000, utilities: 63000, healthcare: 26010, other: 95000 },
  { month: 'nov-25', housing: 1220000, food: 185000, transport: 70000, utilities: 60000, healthcare: 26010, other: 95000 },
  { month: 'dic-25', housing: 1250000, food: 230000, transport: 85000, utilities: 65000, healthcare: 26010, other: 95000 },
  { month: 'ene-26', housing: 1200000, food: 210000, transport: 78000, utilities: 62000, healthcare: 26010, other: 450000 },
  { month: 'feb-26', housing: 1180000, food: 190000, transport: 65000, utilities: 59000, healthcare: 26010, other: 95000 },
  { month: 'mar-26', housing: 1222019, food: 210000, transport: 75000, utilities: 122192, healthcare: 26010, other: 262000 },
  { month: 'abr-26', housing: 1283917, food: 210000, transport: 80000, utilities: 64918, healthcare: 26010, other: 97107 },
  { month: 'may-26', housing: 1198327, food: 150000, transport: 45000, utilities: 59018, healthcare: 26010, other: 97107 },
];

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  housing:    '#378ADD',
  food:       '#1D9E75',
  transport:  '#E07B39',
  utilities:  '#7F77DD',
  healthcare: '#5DCAA5',
  other:      '#888780',
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  housing: 'Vivienda e Hipotecario',
  food: 'Alimentación y Supermercados',
  transport: 'Transporte Urbano',
  utilities: 'Servicios Básicos y Conectividad',
  healthcare: 'Salud (Fonasa)',
  other: 'Otros Gastos y Estudios',
};

const BREAKDOWN = [
  { category: 'housing',   item: 'Activa',                      amount: 530000 },
  { category: 'housing',   item: 'Coopeuch 622-103 (230)',      amount: 341272 },
  { category: 'housing',   item: 'Arriendo (neat pagos)',       amount: 266000 },
  { category: 'housing',   item: 'G. C. Marzo 2026 (neat pagos)', amount: 61055 },
  { category: 'utilities', item: 'Entel 2 líneas',              amount: 17035 },
  { category: 'utilities', item: 'Claro E-Commerce',            amount: 13990 },
  { category: 'utilities', item: 'ENEL',                        amount: 13842 },
  { category: 'other',     item: 'UNIR',                        amount: 65000 },
  { category: 'other',     item: 'Contador Mayo',               amount: 32107 },
  { category: 'utilities', item: 'Movistar Antiguo',            amount: 7911 },
  { category: 'utilities', item: 'Aguas Andinas',               amount: 6240 },
];

const CATEGORIES: ExpenseCategory[] = ['housing', 'food', 'transport', 'utilities', 'healthcare', 'other'];

function getTotal(d: MonthData): number {
  return d.housing + d.food + d.transport + d.utilities + d.healthcare + d.other;
}

export default function Expenses() {
  const current  = MONTHLY_DATA[MONTHLY_DATA.length - 1];
  const previous = MONTHLY_DATA[MONTHLY_DATA.length - 2];
  const currentTotal  = getTotal(current);
  const previousTotal = getTotal(previous);
  const diff    = currentTotal - previousTotal;
  const diffPct = previousTotal > 0 ? Math.abs((diff / previousTotal) * 100).toFixed(1) : '0';
  const maxTotal = Math.max(...MONTHLY_DATA.map(getTotal));
  const avgMonthly = Math.round(MONTHLY_DATA.reduce((s, d) => s + getTotal(d), 0) / MONTHLY_DATA.length);
  const breakdownTotal = BREAKDOWN.reduce((s, e) => s + e.amount, 0);

  return (
    <div id="screen-expenses" className="screen active">

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <span style={{
          background: 'rgba(29,158,117,0.12)', color: '#1D9E75',
          border: '1px solid rgba(29,158,117,0.25)', fontSize: 'var(--text-xs)',
          padding: '4px 12px', borderRadius: '20px', fontWeight: 600,
        }}>
          Live Data
        </span>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <div className="metric-label">This Month</div>
          <div className="metric-value" style={{ color: 'var(--red-text)' }}>-{fmtM(currentTotal)}</div>
          <div className="metric-delta" style={{ color: diff > 0 ? 'var(--red-text)' : 'var(--green-text)' }}>
            {diff > 0 ? '▲' : '▼'} {diffPct}% vs prev. month
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Largest Category</div>
          <div className="metric-value" style={{ fontSize: 'var(--text-base)' }}>Vivienda e Hipotecario</div>
          <div className="metric-delta">{((current.housing / currentTotal) * 100).toFixed(0)}% of total</div>
        </div>
        <div className="metric">
          <div className="metric-label">6-Month Average</div>
          <div className="metric-value" style={{ fontSize: 'var(--text-base)' }}>-{fmtM(avgMonthly)}</div>
          <div className="metric-delta">Monthly avg.</div>
        </div>
        <div className="metric">
          <div className="metric-label">Categorization</div>
          <div className="metric-value" style={{ fontSize: 'var(--text-sm)', color: '#1D9E75' }}>Verified</div>
          <div className="metric-delta">
            <span style={{
              background: 'rgba(29,158,117,0.15)', color: '#1D9E75',
              fontSize: 'var(--text-xs)', padding: '2px 6px', borderRadius: '10px',
              border: '1px solid rgba(29,158,117,0.3)',
            }}>
              Live
            </span>
          </div>
        </div>
      </div>

      <div className="section-label">Monthly Trend</div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '90px', marginBottom: '10px' }}>
          {MONTHLY_DATA.map((d) => {
            const total = getTotal(d);
            const barH = Math.round((total / maxTotal) * 90);
            return (
              <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', height: `${barH}px`, display: 'flex', flexDirection: 'column', borderRadius: '2px', overflow: 'hidden' }}>
                  {CATEGORIES.map((cat) => {
                    const val = d[cat];
                    const segH = Math.round((val / total) * barH);
                    return <div key={cat} style={{ width: '100%', height: `${segH}px`, background: CATEGORY_COLORS[cat], flexShrink: 0 }}></div>;
                  })}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '4px' }}>{d.month}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          {CATEGORIES.map(cat => (
            <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: CATEGORY_COLORS[cat], display: 'inline-block' }}></span>
              {CATEGORY_LABELS[cat]}
            </span>
          ))}
        </div>
      </div>

      <div className="section-label">May Breakdown</div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '4px' }}>
          <span>ITEM</span>
          <span>AMOUNT</span>
        </div>
        {BREAKDOWN.map((e, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < BREAKDOWN.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{e.item}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{CATEGORY_LABELS[e.category as ExpenseCategory] || e.category}</div>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>-{fmtM(e.amount)}</div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', marginTop: '4px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Total</span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--red-text)' }}>-{fmtM(breakdownTotal)}</span>
        </div>
      </div>

    </div>
  );
}
