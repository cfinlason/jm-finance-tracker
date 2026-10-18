// Budget coach: suggests a zero-based allocation of the user's income that also minimises debt cost.
// The app sends its own numbers and validates every suggested amount before anything is applied.
import { askClaude, authorized, clientIp, extractJson, failure, isNum, limited, readBody, responder } from './_anthropic.mjs';

const MAX_LINES = 60;

const SYSTEM = `You are the budget coach inside a personal budgeting app that uses zero-based budgeting: every unit of income gets a job. The user gives you their monthly income, their current budget lines with planned amounts, last month's actual spending per line when known, and a summary of their debts. Suggest a better allocation.

Principles:
- Cover essentials first (housing, utilities, groceries, transport, insurance, minimum debt payments), then a small starter emergency fund if none exists, then pay down high-interest debt aggressively, then savings goals, then wants.
- If the user has debt, route freed-up money to the debt line(s); say which APR makes that worthwhile. If there is no debt line, do not invent one: put the money into savings or the largest-impact existing line.
- Keep wants (eating out, fun, subscriptions, personal care) realistic. Trim, don't zero them, unless the plan is badly short.
- Total of all suggested planned amounts must not exceed the income. It should land within 1% below income (a fully assigned budget).
- Reference lines ONLY by the integer "i" you were given. Use ONLY those indexes. Never invent lines.
- Give whole-number amounts in the user's currency. Do not claim certainty about their situation. You are not a licensed financial advisor.
- Plain, warm language. No emojis. No markdown.

Respond with ONLY a JSON object in exactly this shape:
{"headline":"one sentence, max 100 characters","summary":"2-3 sentences on the logic","changes":[{"i":0,"planned":0,"reason":"max 90 characters"}],"tips":["0 to 3 short tips"]}
Include only lines whose amount you change.`;

function validate(b) {
  if (!b || typeof b !== 'object') return 'Invalid request.';
  if (!isNum(b.income) || b.income <= 0 || b.income > 1e9) return 'Bad income.';
  if (!Array.isArray(b.lines) || b.lines.length === 0 || b.lines.length > MAX_LINES) return 'Provide between 1 and 60 budget lines.';
  for (const l of b.lines) {
    if (!Number.isInteger(l.i) || typeof l.name !== 'string' || l.name.length > 60 || typeof l.group !== 'string' || l.group.length > 60) return 'Bad line.';
    if (!isNum(l.planned) || l.planned < 0 || l.planned > 1e9) return 'Bad planned amount.';
    if (l.lastMonthSpent !== undefined && (!isNum(l.lastMonthSpent) || l.lastMonthSpent < 0)) return 'Bad spend.';
  }
  const d = b.debts;
  if (d !== undefined && (typeof d !== 'object' || !isNum(d.count) || !isNum(d.totalOwed) || !isNum(d.totalMinimums) || !isNum(d.highestApr))) return 'Bad debt summary.';
  return null;
}

function shape(o, lineCount) {
  const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  const changes = (Array.isArray(o.changes) ? o.changes : [])
    .filter((c) => c && Number.isInteger(c.i) && c.i >= 0 && c.i < lineCount && typeof c.planned === 'number' && Number.isFinite(c.planned) && c.planned >= 0)
    .map((c) => ({ i: c.i, planned: Math.round(c.planned), reason: str(c.reason, 140) }));
  if (changes.length === 0) throw new Error('No usable changes');
  return {
    headline: str(o.headline, 160),
    summary: str(o.summary, 700),
    changes,
    tips: (Array.isArray(o.tips) ? o.tips : []).filter((t) => typeof t === 'string').slice(0, 3).map((t) => t.slice(0, 220)),
  };
}

export default async function handler(req, res) {
  const send = responder(res);
  if (req.method !== 'POST') return send(405, { error: 'POST only' });
  if (!authorized(req)) return send(401, { error: 'Access code missing or wrong.', code: 'access_code' });
  if (limited(clientIp(req))) return send(429, { error: 'Too many requests. Try again in a while.', code: 'busy' });
  const body = readBody(req);
  const bad = validate(body);
  if (bad) return send(400, { error: bad, code: 'bad_request' });
  const payload = {
    currency: typeof body.currency === 'string' ? body.currency.slice(0, 3) : undefined,
    monthlyIncome: body.income,
    goals: Array.isArray(body.goals) ? body.goals.filter((g) => typeof g === 'string').slice(0, 5) : [],
    lines: body.lines,
    debts: body.debts,
  };
  try {
    const text = await askClaude({ system: SYSTEM, user: `The user's situation:\n${JSON.stringify(payload)}`, maxTokens: 1400 });
    return send(200, shape(extractJson(text), body.lines.length));
  } catch (e) {
    return failure(send, e);
  }
}
