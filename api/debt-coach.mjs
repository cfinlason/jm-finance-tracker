// Debt coach: turns the app's exact payoff simulation into a plain-language plan.
import { askClaude, clientIp, extractJson, failure, isNum, limited, readBody, responder } from './_anthropic.mjs';

const MAX_DEBTS = 20;

const SYSTEM = `You are the debt coach inside a personal budgeting app. A user has entered their debts and the app has already simulated two payoff strategies. Your job is to turn those numbers into a clear, kind, practical plan.

Rules:
- Use ONLY the figures provided. Never recalculate, estimate or invent amounts, dates, or interest. Quote them as given.
- Recommend exactly one method, "snowball" or "avalanche". If the interest difference is small (under about 3% of total interest), favour whichever builds momentum (usually snowball) and say so. If avalanche saves meaningfully more, say so plainly.
- Be specific about the first 3 months: which debt gets the extra money and what to do when the first debt is cleared.
- You are not a licensed financial advisor. Do not give legal or investment advice. Mention hardship options or credit counselling only if the numbers show the minimums barely cover interest.
- Warm, plain language. No jargon. No emojis. No markdown.

Respond with ONLY a JSON object, no prose around it, in exactly this shape:
{"recommendation":"snowball"|"avalanche","headline":"one sentence, max 90 characters","why":"2-3 sentences","steps":["3 to 5 short action steps, in order"],"watchOut":["0 to 2 short cautions"],"encouragement":"one short sentence"}`;


function validate(body) {
  if (!body || typeof body !== 'object') return 'Invalid request.';
  const { debts, extraMonthly, snowball, avalanche } = body;
  if (!Array.isArray(debts) || debts.length === 0 || debts.length > MAX_DEBTS) return 'Provide between 1 and 20 debts.';
  for (const d of debts) {
    if (typeof d.label !== 'string' || d.label.length > 40) return 'Bad debt label.';
    if (![d.balance, d.apr, d.minPayment].every(isNum) || d.balance < 0 || d.balance > 1e8 || d.apr < 0 || d.apr > 100 || d.minPayment < 0) return 'Bad debt numbers.';
  }
  if (!isNum(extraMonthly) || extraMonthly < 0 || extraMonthly > 1e7) return 'Bad extra payment.';
  for (const s of [snowball, avalanche]) {
    if (!s || !isNum(s.months) || !isNum(s.interest) || !Array.isArray(s.order) || s.order.length > MAX_DEBTS) return 'Bad strategy results.';
    if (!s.order.every((o) => typeof o.label === 'string' && isNum(o.monthDone))) return 'Bad strategy order.';
  }
  return null;
}

function shape(o) {
  const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  const arr = (v, n, max) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, n).map((x) => x.slice(0, max)) : []);
  if (o.recommendation !== 'snowball' && o.recommendation !== 'avalanche') throw new Error('Bad recommendation');
  return {
    recommendation: o.recommendation,
    headline: str(o.headline, 140),
    why: str(o.why, 700),
    steps: arr(o.steps, 6, 260),
    watchOut: arr(o.watchOut, 2, 260),
    encouragement: str(o.encouragement, 160),
  };
}

export default async function handler(req, res) {
  const send = responder(res);
  if (req.method !== 'POST') return send(405, { error: 'POST only' });
  if (limited(clientIp(req))) return send(429, { error: 'Too many requests. Try again in a while.', code: 'busy' });
  const body = readBody(req);
  const bad = validate(body);
  if (bad) return send(400, { error: bad, code: 'bad_request' });
  const payload = {
    currency: typeof body.currency === 'string' ? body.currency.slice(0, 3) : undefined,
    debts: body.debts,
    extraMonthlyAboveMinimums: body.extraMonthly,
    snowball: body.snowball,
    avalanche: body.avalanche,
  };
  try {
    const text = await askClaude({ system: SYSTEM, user: `Here is the user's situation and the app's simulation results (all amounts are in ${payload.currency || 'the same currency'}):
${JSON.stringify(payload)}`, maxTokens: 800 });
    return send(200, shape(extractJson(text)));
  } catch (e) {
    return failure(send, e);
  }
}
