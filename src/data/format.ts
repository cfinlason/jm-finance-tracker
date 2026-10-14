const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const round2 = r2;

export function money(n: number, opts: { cents?: boolean; sign?: boolean } = {}): string {
  const { cents = true, sign = false } = opts;
  const neg = n < 0;
  const abs = Math.abs(r2(n));
  const fixed = cents ? abs.toFixed(2) : String(Math.round(abs));
  const [whole, frac] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = `$${grouped}${frac ? '.' + frac : ''}`;
  if (neg) return `−${body}`;
  return sign && abs > 0 ? `+${body}` : body;
}

/** Whole dollars when the value is round, otherwise cents — keeps rows clean. */
export function moneyAuto(n: number): string {
  return Math.abs(n - Math.round(n)) < 0.005 ? money(n, { cents: false }) : money(n);
}

export function compact(n: number): string {
  const a = Math.abs(n);
  const s = a >= 1_000_000 ? `${(a / 1_000_000).toFixed(1)}M` : a >= 10_000 ? `${Math.round(a / 1000)}k` : a >= 1000 ? `${(a / 1000).toFixed(1)}k` : String(Math.round(a));
  return `${n < 0 ? '−' : ''}$${s}`;
}

export const pct = (n: number) => `${Math.round(n * 100)}%`;

export function parseAmount(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? r2(n) : 0;
}

let counter = 0;
export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
