// Shared helpers for the coach functions. Files starting with "_" are not exposed as routes by Vercel.
// The Anthropic key is read from the server environment only.

export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

export const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

const hits = new Map();
/** Naive per-instance limiter so a leaked URL can't burn the key: 12 requests per IP per hour. */
export function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3_600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 12;
}

export function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

export function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('No JSON in model output');
  return JSON.parse(text.slice(start, end + 1));
}

export function responder(res) {
  return (code, obj) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };
}

export function readBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return undefined; }
  }
  return body;
}

/** Calls Claude and returns the text. Throws { status, code } style errors the handlers translate. */
export async function askClaude({ system, user, maxTokens = 900 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw Object.assign(new Error('missing key'), { code: 'not_configured' });
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(50_000),
  });
  if (!r.ok) {
    const detail = (await r.text()).slice(0, 300);
    console.error('Anthropic error', r.status, detail);
    throw Object.assign(new Error('upstream'), { code: r.status === 401 || r.status === 403 ? 'bad_key' : 'upstream' });
  }
  const data = await r.json();
  return (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
}

export function failure(send, e) {
  if (e?.code === 'not_configured') return send(503, { error: 'The coach isn’t set up on the server yet.', code: 'not_configured' });
  if (e?.code === 'bad_key') return send(503, { error: 'The server’s AI key was rejected.', code: 'bad_key' });
  if (e?.name === 'TimeoutError') return send(504, { error: 'The coach took too long to answer.', code: 'timeout' });
  console.error('Coach failure', e?.message);
  return send(502, { error: 'The coach could not produce a plan.', code: 'failed' });
}
