import { Platform } from 'react-native';
import type { Debt } from '../data/types';
import { simulatePayoff } from '../data/selectors';
import { money, moneyAuto } from '../data/format';

// Public by design: this is only the address of OUR proxy. The Anthropic key never ships in the app.
// On the hosted web version the proxy is a same-origin function at /api/debt-coach.
export const COACH_URL = process.env.EXPO_PUBLIC_DEBT_COACH_URL ?? (Platform.OS === 'web' ? '/api/debt-coach' : '');

export type CoachPlan = {
  recommendation: 'snowball' | 'avalanche';
  headline: string;
  why: string;
  steps: string[];
  watchOut: string[];
  encouragement: string;
};

export class CoachError extends Error {
  constructor(public kind: 'not_configured' | 'offline' | 'busy' | 'timeout' | 'failed', message: string) {
    super(message);
  }
}

/**
 * Asks the coach for a plan. The app's own simulator supplies every number; debt names are replaced
 * with neutral labels ("Debt A"…) before leaving the phone and mapped back afterwards.
 */
export async function askDebtCoach(debts: Debt[], extra: number, currency = 'USD'): Promise<CoachPlan> {
  if (!COACH_URL) throw new CoachError('not_configured', 'The debt coach isn’t connected yet.');
  const live = debts.filter((d) => d.balance > 0);
  const label = (i: number) => `Debt ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`;
  const names = new Map(live.map((d, i) => [d.id, label(i)]));
  const back = new Map(live.map((d, i) => [label(i), d.name]));

  const summarize = (method: 'snowball' | 'avalanche') => {
    const r = simulatePayoff(live, extra, method);
    return { months: r.months, interest: r.interest, order: r.order.map((o) => ({ label: names.get(o.id) ?? o.name, monthDone: o.monthDone })) };
  };
  const body = {
    debts: live.map((d) => ({ label: names.get(d.id) as string, balance: d.balance, apr: d.apr, minPayment: d.minPayment })),
    currency,
    extraMonthly: extra,
    snowball: summarize('snowball'),
    avalanche: summarize('avalanche'),
  };

  let res: Response;
  try {
    res = await fetch(COACH_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
  } catch {
    throw new CoachError('offline', 'Couldn’t reach the coach. Check your connection and try again.');
  }
  if (res.ok === false) {
    let code = '';
    try { code = ((await res.json()) as { code?: string }).code ?? ''; } catch { /* non-JSON error page */ }
    if (res.status === 429 || code === 'busy') throw new CoachError('busy', 'You’ve asked a lot in a short time. Try again in a bit.');
    if (res.status === 404) throw new CoachError('not_configured', 'The coach server wasn’t found. It needs to be deployed with the app.');
    if (code === 'not_configured' || code === 'bad_key') throw new CoachError('not_configured', 'The coach server is running but its AI key isn’t set up (or was rejected).');
    if (res.status === 504 || code === 'timeout') throw new CoachError('timeout', 'The coach took too long to answer. Try again.');
    throw new CoachError('failed', 'The coach is unavailable right now.');
  }
  const plan = (await res.json()) as CoachPlan;
  const real = (s: string) => s.replace(/Debt [A-Z]\d*/g, (m) => back.get(m) ?? m);
  return { ...plan, headline: real(plan.headline), why: real(plan.why), steps: plan.steps.map(real), watchOut: plan.watchOut.map(real), encouragement: real(plan.encouragement) };
}


/**
 * Offline plan built from the same simulator numbers. Used when the AI server can't be reached, so the
 * feature never dead-ends. It's rule-based: avalanche only when it saves a meaningful amount of interest.
 */
export function localDebtPlan(debts: Debt[], extra: number): CoachPlan {
  const live = debts.filter((d) => d.balance > 0);
  const snow = simulatePayoff(live, extra, 'snowball');
  const aval = simulatePayoff(live, extra, 'avalanche');
  const saving = snow.interest - aval.interest;
  const useAvalanche = saving > Math.max(snow.interest * 0.03, 1);
  const chosen = useAvalanche ? aval : snow;
  const order = chosen.order.map((o) => live.find((d) => d.id === o.id)).filter((d): d is Debt => !!d);
  const first = order[0];
  const second = order[1];
  const tight = live.some((d) => (d.balance * d.apr) / 100 / 12 >= d.minPayment * 0.9);
  const steps = [
    `Pay every minimum on time: ${moneyAuto(live.reduce((a, d) => a + d.minPayment, 0))} a month in total.`,
    first ? `Put ${extra > 0 ? `your extra ${moneyAuto(extra)}` : 'any spare money'} on ${first.name} first.` : 'Put any spare money on your first target.',
    first && second ? `When ${first.name} is cleared, add its payment to ${second.name} so the snowball keeps growing.` : 'When one debt is cleared, roll its payment onto the next.',
    `Keep this up and you finish in about ${chosen.months} months with ${money(chosen.interest, { cents: false })} total interest.`,
  ];
  return {
    recommendation: useAvalanche ? 'avalanche' : 'snowball',
    headline: useAvalanche ? `Avalanche saves you ${money(saving, { cents: false })} in interest` : `Snowball: ${first ? `start with ${first.name}` : 'start with your smallest debt'}`,
    why: useAvalanche
      ? `Targeting the highest interest rate first costs ${money(saving, { cents: false })} less than clearing the smallest balances first, which is enough to be worth it.`
      : `The two methods cost almost the same in interest here, so clearing the smallest balance first is the better pick: quick wins keep you going.`,
    steps,
    watchOut: tight ? ['One of your minimums barely covers its monthly interest. Extra payments on that debt matter most, or ask the lender about a lower rate.'] : [],
    encouragement: first ? `${first.name} could be gone in ${order.length ? chosen.order[0].monthDone : 0} months.` : 'Every payment moves you forward.',
  };
}
