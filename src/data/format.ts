const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const round2 = r2;

export type CurrencyCode = 'JMD' | 'USD' | 'CAD' | 'GBP' | 'EUR' | 'AUD' | 'TTD' | 'BBD' | 'KYD';
export const CURRENCIES: Record<CurrencyCode, { code: CurrencyCode; symbol: string; name: string; sampleIncome: number; step: number }> = {
  JMD: { code: 'JMD', symbol: 'J$', name: 'Jamaican dollar', sampleIncome: 200000, step: 500 },
  USD: { code: 'USD', symbol: '$', name: 'US dollar', sampleIncome: 4000, step: 5 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian dollar', sampleIncome: 5000, step: 5 },
  GBP: { code: 'GBP', symbol: '£', name: 'British pound', sampleIncome: 3000, step: 5 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', sampleIncome: 3000, step: 5 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian dollar', sampleIncome: 5500, step: 5 },
  TTD: { code: 'TTD', symbol: 'TT$', name: 'Trinidad & Tobago dollar', sampleIncome: 12000, step: 50 },
  BBD: { code: 'BBD', symbol: 'Bds$', name: 'Barbadian dollar', sampleIncome: 5000, step: 10 },
  KYD: { code: 'KYD', symbol: 'CI$', name: 'Cayman dollar', sampleIncome: 3000, step: 5 },
};
export const CURRENCY_LIST = Object.values(CURRENCIES);

// The active currency is module state so every formatter agrees. ThemeProvider calls setCurrency during render
// and re-renders all themed components when it changes.
let active: CurrencyCode = 'USD';
export const setCurrency = (c: CurrencyCode | string | undefined) => {
  active = c && c in CURRENCIES ? (c as CurrencyCode) : 'USD';
};
export const currentCurrency = () => CURRENCIES[active];
export const sym = (code?: string) => (code && code in CURRENCIES ? CURRENCIES[code as CurrencyCode] : CURRENCIES[active]).symbol;

export function money(n: number, opts: { cents?: boolean; sign?: boolean; code?: string } = {}): string {
  const { cents = true, sign = false, code } = opts;
  const symbol = sym(code);
  const neg = n < 0;
  const abs = Math.abs(r2(n));
  const fixed = cents ? abs.toFixed(2) : String(Math.round(abs));
  const [whole, frac] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = `${symbol}${grouped}${frac ? '.' + frac : ''}`;
  if (neg) return `−${body}`;
  return sign && abs > 0 ? `+${body}` : body;
}

/** Whole units when the value is round, otherwise cents — keeps rows clean. */
export function moneyAuto(n: number, code?: string): string {
  return Math.abs(n - Math.round(n)) < 0.005 ? money(n, { cents: false, code }) : money(n, { code });
}

export function compact(n: number): string {
  const a = Math.abs(n);
  const s = a >= 1_000_000 ? `${(a / 1_000_000).toFixed(1)}M` : a >= 10_000 ? `${Math.round(a / 1000)}k` : a >= 1000 ? `${(a / 1000).toFixed(1)}k` : String(Math.round(a));
  return `${n < 0 ? '−' : ''}${sym()}${s}`;
}

/** Tight form for narrow stat cells: full amount when short, 200k / 1.2M when long. */
export const moneyShort = (n: number): string => (Math.abs(n) >= 100000 ? compact(n) : moneyAuto(n));

/** Adds thousands separators to a raw keypad string ("15000.5" → "15,000.5"). */
export const groupAmount = (raw: string): string => {
  const [w, f] = raw.split('.');
  return w.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f !== undefined ? `.${f}` : '');
};

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
