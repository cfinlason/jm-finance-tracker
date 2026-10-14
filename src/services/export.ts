import type { State } from '../data/store';
import { allItems } from '../data/selectors';

const esc = (v: string | number | undefined) => {
  const s = v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per split so category totals reconcile exactly in a spreadsheet. */
export function buildCsv({ txs, budgets, funds }: Pick<State, 'txs' | 'budgets' | 'funds'>): string {
  const items = allItems(budgets);
  const rows = [['Date', 'Type', 'Merchant', 'Category', 'Amount', 'Note'].join(',')];
  const sorted = [...txs].sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const t of sorted) {
    for (const s of t.splits) {
      const cat = t.kind === 'expense' ? items.get(s.id)?.item.name : t.kind === 'income' ? 'Income' : funds.find((f) => f.id === s.id)?.name;
      rows.push([t.date, t.kind, esc(t.merchant), esc(cat ?? 'Uncategorized'), s.amount.toFixed(2), esc(t.note)].join(','));
    }
  }
  return rows.join('\n');
}
