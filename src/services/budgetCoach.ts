import { round2 } from '../data/format';
import { apiHeaders, apiUrl } from './api';

export const BUDGET_COACH_URL = apiUrl('budget-coach');

export type CoachLine = { i: number; id: string; group: string; name: string; planned: number; lastMonthSpent?: number; isFund?: boolean };
export type DebtSummary = { count: number; totalOwed: number; totalMinimums: number; highestApr: number };
export type CoachInput = { income: number; currency: string; goals: string[]; lines: CoachLine[]; debts?: DebtSummary; step: number };
export type BudgetChange = { i: number; planned: number; reason: string };
export type BudgetPlan = { headline: string; summary: string; changes: BudgetChange[]; tips: string[]; source: 'ai' | 'local'; note?: string };

export class BudgetCoachError extends Error {
  constructor(public kind: 'not_configured' | 'offline' | 'busy' | 'timeout' | 'failed', message: string) {
    super(message);
  }
}

/** Sends the budget to the proxy and validates the answer: totals must fit the income or the plan is rejected. */
export async function askBudgetCoach(input: CoachInput): Promise<BudgetPlan> {
  if (!BUDGET_COACH_URL) throw new BudgetCoachError('not_configured', 'The coach server isn’t connected in this build.');
  const body = { income: input.income, currency: input.currency, goals: input.goals, debts: input.debts, lines: input.lines.map(({ i, group, name, planned, lastMonthSpent, isFund }) => ({ i, group, name, planned, lastMonthSpent, isFund })) };
  let res: Response;
  try {
    res = await fetch(BUDGET_COACH_URL, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body), signal: AbortSignal.timeout(58_000) });
  } catch {
    throw new BudgetCoachError('offline', 'Couldn’t reach the coach. Check your connection.');
  }
  if (!res.ok) {
    let code = '';
    try { code = ((await res.json()) as { code?: string }).code ?? ''; } catch { /* html error page */ }
    if (code === 'access_code') throw new BudgetCoachError('not_configured', 'Enter your access code in Settings → AI access code.');
    if (res.status === 429 || code === 'busy') throw new BudgetCoachError('busy', 'You’ve asked a lot in a short time. Try again in a bit.');
    if (res.status === 404) throw new BudgetCoachError('not_configured', 'The coach server wasn’t found. It needs to be deployed with the app.');
    if (code === 'not_configured' || code === 'bad_key') throw new BudgetCoachError('not_configured', 'The coach server is running but its AI key isn’t set up (or was rejected).');
    if (res.status === 504 || code === 'timeout') throw new BudgetCoachError('timeout', 'The coach took too long to answer.');
    throw new BudgetCoachError('failed', 'The coach is unavailable right now.');
  }
  const raw = (await res.json()) as { headline: string; summary: string; changes: BudgetChange[]; tips: string[] };
  const byI = new Map(input.lines.map((l) => [l.i, l]));
  const changes = raw.changes.filter((c) => byI.has(c.i) && c.planned >= 0);
  const total = round2(input.lines.reduce((a, l) => a + (changes.find((c) => c.i === l.i)?.planned ?? l.planned), 0));
  if (changes.length === 0 || total > input.income * 1.005) throw new BudgetCoachError('failed', 'The suggested plan didn’t add up, so it was discarded.');
  return { headline: raw.headline, summary: raw.summary, changes, tips: raw.tips, source: 'ai' };
}

const WANTS = /eating out|restaurant|fun|subscri|entertain|personal|shopping|hobb|coffee|takeout|streaming/i;
const DEBT = /debt|loan|credit|card|extra debt/i;
const EMERGENCY = /emergency/i;

/**
 * Rule-based plan used when the AI is unavailable. It fully assigns the income, trims wants first,
 * and sends freed-up money to debt (if the user has any) or to the emergency fund.
 */
export function localBudgetPlan(input: CoachInput): BudgetPlan {
  const { income, lines, debts, step } = input;
  const round = (n: number) => Math.max(0, Math.round(n / step) * step);
  const planned = new Map(lines.map((l) => [l.i, l.planned]));
  const reasons = new Map<number, string>();
  const total = () => round2([...planned.values()].reduce((a, b) => a + b, 0));
  const wants = lines.filter((l) => WANTS.test(l.name) && !l.isFund);
  const buffer = lines.find((l) => /buffer/i.test(l.name));
  const debtLines = lines.filter((l) => DEBT.test(l.name) || DEBT.test(l.group));
  const extraDebt = debtLines.find((l) => /extra/i.test(l.name)) ?? debtLines[debtLines.length - 1];
  const emergency = lines.find((l) => EMERGENCY.test(l.name)) ?? lines.find((l) => l.isFund);

  const reduce = (l: CoachLine, by: number, why: string) => {
    const cur = planned.get(l.i) ?? 0;
    const next = round(Math.max(0, cur - by));
    if (next !== cur) {
      planned.set(l.i, next);
      reasons.set(l.i, why);
    }
  };

  // 1) If the plan overshoots income, trim wants (up to 60%), then the buffer.
  let over = round2(total() - income);
  if (over > 0) {
    const wantsTotal = wants.reduce((a, l) => a + l.planned, 0);
    for (const l of wants) if (wantsTotal > 0) reduce(l, Math.min(l.planned * 0.6, (over * l.planned) / wantsTotal), 'Trimmed so the plan fits your income');
    over = round2(total() - income);
    if (over > 0 && buffer) reduce(buffer, over, 'Reduced to fit your income');
  }

  // 2) With debt, free 20% of wants for debt; any unassigned income goes there too.
  if (debts && debts.count > 0) {
    for (const l of wants) {
      const cur = planned.get(l.i) ?? 0;
      const cut = round(cur * 0.2);
      if (cut > 0) {
        planned.set(l.i, cur - cut);
        reasons.set(l.i, 'Trimmed 20% to speed up debt payoff');
      }
    }
  }
  // Whatever is unassigned now (original slack plus anything just freed) gets a job.
  const slack = Math.max(0, round2(income - total()));
  const sink = debts && debts.count > 0 ? extraDebt ?? emergency : emergency ?? lines[0];
  const add = Math.floor(slack / step) * step;
  if (sink && add > 0) {
    planned.set(sink.i, (planned.get(sink.i) ?? 0) + add);
    reasons.set(sink.i, debts && debts.count > 0 && DEBT.test(sink.name + sink.group) ? `Extra to debt${debts.highestApr ? ` (your highest rate is ${debts.highestApr}% APR)` : ''}` : 'Unassigned income put to work in savings');
  }
  // Rounding can leave a sliver over income; take it from the biggest want or buffer.
  const sliver = round2(total() - income);
  if (sliver > 0) {
    const t = buffer ?? wants[0];
    if (t) planned.set(t.i, Math.max(0, (planned.get(t.i) ?? 0) - sliver));
  }

  const changes: BudgetChange[] = lines
    .map((l) => ({ i: l.i, planned: round2(planned.get(l.i) ?? l.planned), reason: reasons.get(l.i) ?? '' }))
    .filter((c) => Math.abs(c.planned - (lines.find((l) => l.i === c.i)?.planned ?? 0)) > 0.005);

  const hasDebt = !!debts && debts.count > 0;
  return {
    source: 'local',
    headline: hasDebt ? 'Every unit assigned, with more going to debt' : 'Every unit assigned, with the rest going to savings',
    summary: hasDebt
      ? 'Your essentials stay put. Wants are trimmed by about a fifth and the difference goes to your debt, so you pay less interest overall.'
      : 'Your essentials stay put and anything unassigned goes to your emergency fund so every unit has a job.',
    changes,
    tips: hasDebt ? ['Pay every minimum on time, then aim all extra money at one debt.'] : ['Build a starter emergency fund before adding new goals.'],
  };
}
