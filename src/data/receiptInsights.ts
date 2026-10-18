import { diffDays, todayISO } from './dates';
import { round2 } from './format';
import type { Receipt } from './types';

export type ItemStat = {
  key: string;
  label: string;
  category: string;
  receipts: number; // how many receipts it appears on
  units: number;
  spend: number;
  avgPrice: number; // per unit
  firstSeen: string;
  lastSeen: string;
  avgGapDays: number | null; // typical days between purchases
  daysSince: number;
  priceChange: number | null; // % change in unit price, first → last
};

export type Insights = {
  receiptCount: number;
  spendTotal: number;
  topByCount: ItemStat[];
  topBySpend: ItemStat[];
  droppedOff: ItemStat[]; // used to buy it regularly, not lately
  priceUps: ItemStat[];
  merchants: { name: string; visits: number; spend: number }[];
  categories: { name: string; spend: number }[];
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

export function computeInsights(receipts: Receipt[], today = todayISO()): Insights {
  const byKey = new Map<string, { label: string; category: string; rows: { date: string; qty: number; price: number; receiptId: string }[] }>();
  const merchants = new Map<string, { visits: number; spend: number }>();
  const cats = new Map<string, number>();
  let spendTotal = 0;

  for (const r of receipts) {
    spendTotal += r.total;
    const m = (r.merchant || 'Unknown').trim();
    const cur = merchants.get(m) ?? { visits: 0, spend: 0 };
    merchants.set(m, { visits: cur.visits + 1, spend: round2(cur.spend + r.total) });
    for (const it of r.items) {
      const key = norm(it.canonical || it.name);
      if (!key) continue;
      const e = byKey.get(key) ?? { label: it.canonical || it.name, category: it.category, rows: [] };
      e.rows.push({ date: r.date, qty: it.qty || 1, price: it.price, receiptId: r.id });
      byKey.set(key, e);
      cats.set(it.category || 'other', round2((cats.get(it.category || 'other') ?? 0) + it.price));
    }
  }

  const stats: ItemStat[] = [...byKey.entries()].map(([key, e]) => {
    const rows = [...e.rows].sort((a, b) => (a.date < b.date ? -1 : 1));
    const dates = [...new Set(rows.map((r) => r.date))];
    const gaps = dates.slice(1).map((d, i) => diffDays(d, dates[i]));
    const units = rows.reduce((a, r) => a + r.qty, 0);
    const spend = round2(rows.reduce((a, r) => a + r.price, 0));
    const unit = (r: { qty: number; price: number }) => r.price / (r.qty || 1);
    const first = unit(rows[0]);
    const last = unit(rows[rows.length - 1]);
    return {
      key,
      label: e.label.charAt(0).toUpperCase() + e.label.slice(1),
      category: e.category,
      receipts: new Set(rows.map((r) => r.receiptId)).size,
      units,
      spend,
      avgPrice: round2(spend / (units || 1)),
      firstSeen: rows[0].date,
      lastSeen: rows[rows.length - 1].date,
      avgGapDays: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
      daysSince: Math.max(0, diffDays(today, rows[rows.length - 1].date)),
      priceChange: rows.length >= 2 && first > 0 ? round2(((last - first) / first) * 100) : null,
    };
  });

  const repeat = stats.filter((s) => s.receipts >= 2);
  return {
    receiptCount: receipts.length,
    spendTotal: round2(spendTotal),
    topByCount: [...stats].sort((a, b) => b.receipts - a.receipts || b.spend - a.spend).slice(0, 8),
    topBySpend: [...stats].sort((a, b) => b.spend - a.spend).slice(0, 8),
    // "Dropped off": bought at least twice, and it's now been well over its usual gap (min 14 days) since the last purchase.
    droppedOff: repeat.filter((s) => s.avgGapDays !== null && s.daysSince > Math.max(14, s.avgGapDays * 2)).sort((a, b) => b.daysSince - a.daysSince).slice(0, 6),
    priceUps: repeat.filter((s) => s.priceChange !== null && Math.abs(s.priceChange) >= 8).sort((a, b) => Math.abs(b.priceChange ?? 0) - Math.abs(a.priceChange ?? 0)).slice(0, 6),
    merchants: [...merchants.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.spend - a.spend).slice(0, 6),
    categories: [...cats.entries()].map(([name, spend]) => ({ name, spend })).sort((a, b) => b.spend - a.spend).slice(0, 8),
  };
}
