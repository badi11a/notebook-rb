export function fmtM(n: number): string {
  const absN = Math.round(Math.abs(n));
  const sign = n < 0 ? '-' : '';
  if (absN >= 1_000_000) return `${sign}$${(absN / 1_000_000).toFixed(1)}M`;
  if (absN >= 1_000)     return `${sign}$${Math.round(absN / 1_000)}k`;
  return `${sign}$${absN}`;
}
