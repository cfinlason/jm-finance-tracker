import { Platform } from 'react-native';
import type { Debt } from '../data/types';
import { simulatePayoff } from '../data/selectors';

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
  constructor(public kind: 'not_configured' | 'offline' | 'busy' | 'failed', message: string) {
    super(message);
  }
}

/**
 * Asks the coach for a plan. The app's own simulator supplies every number; debt names are replaced
 * with neutral labels ("Debt A"…) before leaving the phone and mapped back afterwards.
 */
export async function askDebtCoach(debts: Debt[], extra: number): Promise<CoachPlan> {
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
  if (res.status === 429) throw new CoachError('busy', 'You’ve asked a lot in a short time. Try again in a bit.');
  if (!res.ok) throw new CoachError('failed', 'The coach is unavailable right now. Your roadmap above still works.');
  const plan = (await res.json()) as CoachPlan;
  const real = (s: string) => s.replace(/Debt [A-Z]\d*/g, (m) => back.get(m) ?? m);
  return { ...plan, headline: real(plan.headline), why: real(plan.why), steps: plan.steps.map(real), watchOut: plan.watchOut.map(real), encouragement: real(plan.encouragement) };
}
