// Debt coach proxy. The Anthropic key lives ONLY here (ANTHROPIC_API_KEY), never in the app.
// Deploy as a Vercel function (this folder is the project root) or run locally with `node dev.mjs`.
//
// The app sends numbers it already computed with its own simulator. Claude explains and plans around
// those numbers; it is told not to invent or recalculate any figure.

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const MAX_DEBTS = 20;

const SYSTEM = `You are the debt coach inside a personal budgeting app. A user has entered their debts and the app has already simulated two payoff strategies. Your job is to turn those numbers into a clear, kind, practical plan.

Rules:
- Use ONLY the figures provided. Never recalculate, estimate or invent amounts, dates, or interest. Quote them as given.
- Recommend exactly one method, "snowball" or "avalanche". If the interest difference is small (under about 3% of total interest or under $150), favour whichever builds momentum (usually snowball) and say so. If avalanche saves meaningfully more, say so plainly.
- Be specific about the first 3 months: which debt gets the extra money and what to do when the first debt is cleared.
- You are not a licensed financial advisor. Do not give legal or investment advice. Mention hardship options or credit counselling only if the numbers show the minimums barely cover interest.
- Warm, plain language. No jargon. No emojis. No markdown.

Respond with ONLY a JSON object, no prose around it, in exactly this shape:
{"recommendation":"snowball"|"avalanche","headline":"one sentence, max 90 characters","why":"2-3 sentences","steps":["3 to 5 short action steps, in order"],"watchOut":["0 to 2 short cautions"],"encouragement":"one short sentence"}`;

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

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

// Naive per-instance limiter so a leaked URL can't burn the key: 10 requests per IP per hour.
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3_600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 10;
}

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('No JSON in model output');
  return JSON.parse(text.slice(start, end + 1));
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
  const send = (code, obj) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };
  if (req.method !== 'POST') return send(405, { error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return send(500, { error: 'Coach is not configured on the server.' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (limited(ip)) return send(429, { error: 'Too many requests. Try again in a while.' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return send(400, { error: 'Invalid JSON.' }); }
  }
  const bad = validate(body);
  if (bad) return send(400, { error: bad });

  const payload = {
    debts: body.debts,
    extraMonthlyAboveMinimums: body.extraMonthly,
    snowball: body.snowball,
    avalanche: body.avalanche,
  };

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 900,
        system: SYSTEM,
        messages: [{ role: 'user', content: `Here is the user's situation and the app's simulation results:\n${JSON.stringify(payload)}` }],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!r.ok) {
      console.error('Anthropic error', r.status, (await r.text()).slice(0, 300));
      return send(502, { error: 'The coach is unavailable right now.' });
    }
    const data = await r.json();
    const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    return send(200, shape(extractJson(text)));
  } catch (e) {
    console.error('Coach failure', e?.message);
    return send(502, { error: 'The coach could not produce a plan. Please try again.' });
  }
}
