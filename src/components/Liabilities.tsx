'use client';

const LIABILITIES_DATA = [
  {
    name: 'Hipotecario BCI',
    institution: 'Banco BCI',
    totalAmount: 100_000_000,
    outstanding: 61_911_128,
    monthlyPayment: 530_000,
    nextDueDate: 'Jun 5, 2026',
    interestRate: 3.85,
    termYears: 25,
  },
  {
    name: 'Hipotecario Coopeuch',
    institution: 'Coopeuch',
    totalAmount: 100_000_000,
    outstanding: 65_707_845,
    monthlyPayment: 545_000,
    nextDueDate: 'Jun 10, 2026',
    interestRate: 3.95,
    termYears: 25,
  },
  {
    name: 'Cheques Pie Huanuco',
    institution: 'Inmobiliaria Activa',
    totalAmount: 21_730_000,
    outstanding: 16_960_000,
    monthlyPayment: 530_000,
    nextDueDate: 'Jun 1, 2026',
    interestRate: 0,
    termYears: 3,
  },
  {
    name: 'Impuestos SII (177 UTM)',
    institution: 'SII',
    totalAmount: 12_494_076,
    outstanding: 12_494_076,
    monthlyPayment: 0,
    nextDueDate: 'Por definir',
    interestRate: 0,
    termYears: 1,
  },
  {
    name: 'Mastercard Black',
    institution: 'Banco BCI',
    totalAmount: 1_112_920,
    outstanding: 1_112_920,
    monthlyPayment: 1_112_920,
    nextDueDate: 'Jun 5, 2026',
    interestRate: 24.0,
    termYears: 0,
  },
];

const AMORT_DATA = [
  { year: 'ago-25', principal: 167_190_874, interest: 0 },
  { year: 'sep-25', principal: 169_497_541, interest: 0 },
  { year: 'oct-25', principal: 168_631_626, interest: 0 },
  { year: 'nov-25', principal: 168_892_261, interest: 0 },
  { year: 'dic-25', principal: 161_857_050, interest: 0 },
  { year: 'ene-26', principal: 161_110_207, interest: 0 },
  { year: 'feb-26', principal: 160_103_594, interest: 0 },
  { year: 'mar-26', principal: 159_715_138, interest: 0 },
  { year: 'abr-26', principal: 158_838_558, interest: 0 },
  { year: 'may-26', principal: 158_185_969, interest: 0 },
];

function fmtM(n: number): string {
  const absN = Math.round(Math.abs(n));
  if (absN >= 1_000_000) return `$${(absN / 1_000_000).toFixed(1)}M`;
  if (absN >= 1_000) return `$${Math.round(absN / 1_000)}k`;
  return `$${absN}`;
}

export default function Liabilities() {
  const totalOutstanding = LIABILITIES_DATA.reduce((s, l) => s + l.outstanding, 0);
  const totalMonthly = LIABILITIES_DATA.reduce((s, l) => s + l.monthlyPayment, 0);
  const maxAmort = Math.max(...AMORT_DATA.map(d => d.principal + d.interest));

  return (
    <div id="screen-liabilities" className="screen active">

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
          <div className="metric-label">Total Outstanding</div>
          <div className="metric-value" style={{ color: 'var(--red-text)' }}>-{fmtM(totalOutstanding)}</div>
          <div className="metric-delta">{LIABILITIES_DATA.length} active liabilities</div>
        </div>
        <div className="metric">
          <div className="metric-label">Monthly Payments</div>
          <div className="metric-value" style={{ fontSize: 'var(--text-base)' }}>-{fmtM(totalMonthly)}</div>
          <div className="metric-delta">Debt service</div>
        </div>
        <div className="metric">
          <div className="metric-label">Avg. Interest Rate</div>
          <div className="metric-value" style={{ fontSize: 'var(--text-base)' }}>5.8%</div>
          <div className="metric-delta">Weighted avg.</div>
        </div>
        <div className="metric">
          <div className="metric-label">Debt-to-Income</div>
          <div className="metric-value" style={{ fontSize: 'var(--text-base)' }}>22.4%</div>
          <div className="metric-delta">Monthly ratio</div>
        </div>
      </div>

      <div className="section-label">Active Liabilities</div>
      <div className="card">
        {LIABILITIES_DATA.map((l, i) => {
          const paidPct = Math.round(((l.totalAmount - l.outstanding) / l.totalAmount) * 100);
          return (
            <div key={i} style={{ padding: '14px 0', borderBottom: i < LIABILITIES_DATA.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{l.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    {l.institution} · {l.interestRate}% annual · {l.termYears}yr term
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--red-text)' }}>-{fmtM(l.outstanding)}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>outstanding</div>
                </div>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                  <span>Capital paid: {paidPct}%</span>
                  <span>Remaining: {100 - paidPct}%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${paidPct}%`, background: '#1D9E75', borderRadius: '3px', transition: 'width 0.3s' }}></div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                <span>Monthly: <strong style={{ color: 'var(--text-primary)' }}>-{fmtM(l.monthlyPayment)}</strong></span>
                <span>Next due: <strong style={{ color: 'var(--text-primary)' }}>{l.nextDueDate}</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="section-label">Amortization Projection</div>
      <div className="card">
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '14px' }}>
          Monthly liability evolution
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '90px' }}>
          {AMORT_DATA.map((d) => {
            const total = d.principal + d.interest;
            const totalH = Math.round((total / maxAmort) * 90);
            const principalH = Math.round((d.principal / total) * totalH);
            const interestH = totalH - principalH;
            return (
              <div key={d.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: `${interestH}px`, background: '#E24B4A', opacity: 0.65 }}></div>
                  <div style={{ width: '100%', height: `${principalH}px`, background: '#1D9E75' }}></div>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '4px' }}>{d.year}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '14px', marginTop: '10px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#1D9E75', display: 'inline-block' }}></span>
            Total Debt
          </span>
        </div>
      </div>
    </div>
  );
}
