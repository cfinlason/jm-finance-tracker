import { addMonths, daysInMonth, diffDays, fromISO, monthKey, todayISO } from './dates';
import { round2 } from './format';
import type { State } from './store';
import { Budget, BudgetItem, Debt, Fund, Group, ID, Tx } from './types';

export const sum = (xs: number[]) => round2(xs.reduce((a, b) => a + b, 0));

export function txsInMonth(txs: Tx[], month: string): Tx[] {
  return txs.filter((t) => t.date.startsWith(month));
}

export type MonthSummary = {
  budget: Budget | undefined;
  plannedIncome: number;
  receivedIncome: number;
  plannedExpenses: number;
  spent: number;
  /** Money you can still give a job: the larger of planned/received income, minus everything planned. */
  leftToBudget: number;
  /** Unspent portion of what you planned to spend. */
  remaining: number;
  /** Income that arrived beyond what was planned. */
  extraIncome: number;
  itemSpent: Record<ID, number>;
  incomeReceived: Record<ID, number>;
  groupSpent: Record<ID, number>;
  groupPlanned: Record<ID, number>;
  unassignedSpent: number;
};

export function summarizeMonth(txs: Tx[], budget: Budget | undefined, month: string): MonthSummary {
  const itemSpent: Record<ID, number> = {};
  const incomeReceived: Record<ID, number> = {};
  const itemIds = new Set<ID>();
  const incomeIds = new Set<ID>();
  budget?.groups.forEach((g) => g.items.forEach((i) => itemIds.add(i.id)));
  budget?.incomes.forEach((i) => incomeIds.add(i.id));

  let spent = 0;
  let receivedIncome = 0;
  let unassignedSpent = 0;
  for (const t of txsInMonth(txs, month)) {
    // Fund withdrawals/deposits deliberately never touch the monthly budget.
    if (t.kind === 'expense') {
      for (const s of t.splits) {
        spent += s.amount;
        if (itemIds.has(s.id)) itemSpent[s.id] = round2((itemSpent[s.id] ?? 0) + s.amount);
        else unassignedSpent += s.amount;
      }
    } else if (t.kind === 'income') {
      for (const s of t.splits) {
        receivedIncome += s.amount;
        if (incomeIds.has(s.id)) incomeReceived[s.id] = round2((incomeReceived[s.id] ?? 0) + s.amount);
      }
    }
  }
  const plannedIncome = sum((budget?.incomes ?? []).map((i) => i.planned));
  const groupSpent: Record<ID, number> = {};
  const groupPlanned: Record<ID, number> = {};
  budget?.groups.forEach((g) => {
    groupSpent[g.id] = sum(g.items.map((i) => itemSpent[i.id] ?? 0));
    groupPlanned[g.id] = sum(g.items.map((i) => i.planned));
  });
  const plannedExpenses = sum(Object.values(groupPlanned));
  receivedIncome = round2(receivedIncome);
  spent = round2(spent);
  const baseline = Math.max(plannedIncome, receivedIncome);
  return {
    budget,
    plannedIncome,
    receivedIncome,
    plannedExpenses,
    spent,
    leftToBudget: round2(baseline - plannedExpenses),
    remaining: round2(plannedExpenses - spent),
    extraIncome: round2(Math.max(0, receivedIncome - plannedIncome)),
    itemSpent,
    incomeReceived,
    groupSpent,
    groupPlanned,
    unassignedSpent: round2(unassignedSpent),
  };
}

export function allItems(budgets: Record<string, Budget>): Map<ID, { item: BudgetItem; group: Group; month: string }> {
  const m = new Map<ID, { item: BudgetItem; group: Group; month: string }>();
  for (const [month, b] of Object.entries(budgets).sort(([a], [b2]) => (a < b2 ? -1 : 1))) {
    for (const g of b.groups) for (const i of g.items) m.set(i.id, { item: i, group: g, month });
  }
  return m;
}

export function itemFundMap(budgets: Record<string, Budget>): Map<ID, ID> {
  const m = new Map<ID, ID>();
  for (const b of Object.values(budgets)) for (const g of b.groups) for (const i of g.items) if (i.fundId) m.set(i.id, i.fundId);
  return m;
}

/** Fund balance = opening + budget contributions + windfall deposits − spending from the fund. */
export function fundBalances(state: Pick<State, 'funds' | 'txs' | 'budgets'>): Record<ID, number> {
  const map = itemFundMap(state.budgets);
  const bal: Record<ID, number> = {};
  state.funds.forEach((f) => (bal[f.id] = f.opening));
  for (const t of state.txs) {
    for (const s of t.splits) {
      if (t.kind === 'expense') {
        const fid = map.get(s.id);
        if (fid && fid in bal) bal[fid] += s.amount;
      } else if (t.kind === 'fund_deposit' && s.id in bal) bal[s.id] += s.amount;
      else if (t.kind === 'fund_spend' && s.id in bal) bal[s.id] -= s.amount;
    }
  }
  for (const k of Object.keys(bal)) bal[k] = round2(bal[k]);
  return bal;
}

/** How much to set aside each month to hit a fund goal by its target date. */
export function monthlyNeed(fund: Fund, balance: number, from = todayISO()): { perMonth: number; months: number } | null {
  if (!fund.targetDate) return null;
  const remaining = Math.max(0, fund.goal - balance);
  const days = diffDays(fund.targetDate, from);
  if (days <= 0) return { perMonth: remaining, months: 0 };
  const months = Math.max(1, Math.round(days / 30.4));
  return { perMonth: round2(remaining / months), months };
}

export type Bill = { item: BudgetItem; group: Group; date: string; paid: boolean; overdue: boolean; daysAway: number };

export function billsForMonth(budget: Budget | undefined, month: string, paid: Record<string, boolean>): Bill[] {
  if (!budget) return [];
  const today = todayISO();
  const out: Bill[] = [];
  for (const g of budget.groups)
    for (const i of g.items) {
      if (!i.dueDay) continue;
      const day = Math.min(i.dueDay, daysInMonth(month));
      const date = `${month}-${String(day).padStart(2, '0')}`;
      const isPaid = !!paid[`${month}:${i.id}`];
      const daysAway = diffDays(date, today);
      out.push({ item: i, group: g, date, paid: isPaid, overdue: !isPaid && daysAway < 0, daysAway });
    }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.item.name.localeCompare(b.item.name)));
}

export type MonthPoint = { month: string; income: number; spent: number; net: number };

export function monthlySeries(txs: Tx[], endMonth: string, count: number): MonthPoint[] {
  const out: MonthPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const month = addMonths(endMonth, -i);
    let income = 0;
    let spent = 0;
    for (const t of txs) {
      if (!t.date.startsWith(month)) continue;
      if (t.kind === 'income') income += t.amount;
      else if (t.kind === 'expense') spent += t.amount;
    }
    out.push({ month, income: round2(income), spent: round2(spent), net: round2(income - spent) });
  }
  return out;
}

/** Spend per budget group for a month, ordered largest-first (used by the donut). */
export function spendByGroup(txs: Tx[], budget: Budget | undefined, month: string): { id: ID; name: string; icon: Group['icon']; amount: number }[] {
  const s = summarizeMonth(txs, budget, month);
  const rows = (budget?.groups ?? []).map((g) => ({ id: g.id, name: g.name, icon: g.icon, amount: s.groupSpent[g.id] ?? 0 })).filter((r) => r.amount > 0);
  if (s.unassignedSpent > 0) rows.push({ id: '__other', name: 'Other', icon: 'receipt', amount: s.unassignedSpent });
  return rows.sort((a, b) => b.amount - a.amount);
}

export function merchantTotals(txs: Tx[], month: string, limit = 5): { name: string; amount: number; count: number }[] {
  const m = new Map<string, { amount: number; count: number }>();
  for (const t of txsInMonth(txs, month)) {
    if (t.kind !== 'expense' || !t.merchant) continue;
    const key = t.merchant.trim();
    const cur = m.get(key) ?? { amount: 0, count: 0 };
    m.set(key, { amount: round2(cur.amount + t.amount), count: cur.count + 1 });
  }
  return [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.amount - a.amount).slice(0, limit);
}

// ---- Debt roadmap -------------------------------------------------------------------

export type PayoffResult = { months: number; interest: number; order: { id: ID; name: string; monthDone: number }[]; capped: boolean };

/** Debt snowball (smallest balance first) or avalanche (highest APR first), with an extra monthly amount. */
export function simulatePayoff(debts: Debt[], extra: number, method: 'snowball' | 'avalanche'): PayoffResult {
  const ds = debts.filter((d) => d.balance > 0).map((d) => ({ ...d }));
  const order: PayoffResult['order'] = [];
  let months = 0;
  let interest = 0;
  const cap = 600;
  const rank = (a: Debt, b: Debt) => (method === 'snowball' ? a.balance - b.balance : b.apr - a.apr);
  while (ds.some((d) => d.balance > 0.005) && months < cap) {
    months += 1;
    for (const d of ds) {
      if (d.balance <= 0) continue;
      const i = round2((d.balance * d.apr) / 100 / 12);
      d.balance = round2(d.balance + i);
      interest += i;
    }
    let pool = extra;
    // Minimums first, then everything left rolls onto the focus debt.
    for (const d of ds) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.minPayment, d.balance);
      d.balance = round2(d.balance - pay);
    }
    const open = ds.filter((d) => d.balance > 0.005).sort(rank);
    for (const d of open) {
      if (pool <= 0) break;
      const pay = Math.min(pool, d.balance);
      d.balance = round2(d.balance - pay);
      pool = round2(pool - pay);
    }
    // Freed-up minimums keep rolling: add them back into the pool for next month by raising extra.
    for (const d of ds) {
      if (d.balance <= 0.005 && !order.find((o) => o.id === d.id)) {
        order.push({ id: d.id, name: d.name, monthDone: months });
        extra += d.minPayment;
        d.balance = 0;
        d.minPayment = 0;
      }
    }
  }
  return { months, interest: round2(interest), order, capped: months >= cap };
}

export function payoffDate(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return monthKey(d);
}

export function isFuture(iso: string) {
  return fromISO(iso).getTime() > Date.now();
}
