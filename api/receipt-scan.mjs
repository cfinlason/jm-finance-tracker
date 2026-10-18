// Receipt scanner: reads a photo of a receipt with Claude vision and returns structured data.
// The photo is forwarded to Claude and discarded; nothing is stored on the server.
import { askClaude, authorized, clientIp, extractJson, failure, isNum, limited, readBody, responder } from './_anthropic.mjs';

const MAX_IMAGE_B64 = 3_400_000; // keeps the whole request under Vercel's 4.5 MB body limit
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_ITEMS = 120;

const SYSTEM = `You read photos of retail receipts and return clean structured data for a personal budgeting app.

Rules:
- Transcribe only what is printed. Never invent items, prices or totals. If something is unreadable, use null for it.
- Amounts are plain numbers (no currency symbols or thousands separators). Use a dot for decimals.
- "price" is the line total for that item (quantity times unit price, after any line discount). "qty" defaults to 1.
- "canonical" is a short, generic, lowercase name for what the item is, without brand, size or pack count (for example "whole milk 2L" becomes "milk"; "COKE ZERO 12PK" becomes "cola"). Use the same canonical name for the same kind of product. Singular form.
- "category" is one of: groceries, produce, dairy, meat, bakery, beverages, snacks, household, personal care, health, electronics, clothing, dining, fuel, other.
- Do not include totals, tax, change, card, or loyalty lines as items.
- "date" is the purchase date as YYYY-MM-DD, or null if not printed.
- If the image is not a receipt, return {"error":"not_a_receipt"}.

Respond with ONLY a JSON object in exactly this shape:
{"merchant":string|null,"date":string|null,"currency":string|null,"subtotal":number|null,"tax":number|null,"total":number|null,"items":[{"name":string,"canonical":string,"category":string,"qty":number,"price":number}],"notes":string|null}`;

function shape(o) {
  if (o && o.error) throw Object.assign(new Error('not a receipt'), { code: 'not_a_receipt' });
  const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  const num = (v) => (isNum(v) && v >= 0 && v < 1e9 ? Math.round(v * 100) / 100 : null);
  const date = typeof o.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : null;
  const items = (Array.isArray(o.items) ? o.items : [])
    .filter((i) => i && typeof i.name === 'string' && isNum(i.price))
    .slice(0, MAX_ITEMS)
    .map((i) => ({
      name: String(i.name).trim().slice(0, 80),
      canonical: (str(i.canonical, 40) || String(i.name).trim().slice(0, 40)).toLowerCase(),
      category: str(i.category, 30) || 'other',
      qty: isNum(i.qty) && i.qty > 0 && i.qty < 1000 ? i.qty : 1,
      price: Math.round(i.price * 100) / 100,
    }));
  const total = num(o.total) ?? (items.length ? Math.round(items.reduce((a, i) => a + i.price, 0) * 100) / 100 : null);
  if (total === null && items.length === 0) throw new Error('Nothing readable');
  return { merchant: str(o.merchant, 80), date, currency: str(o.currency, 3), subtotal: num(o.subtotal), tax: num(o.tax), total, items, notes: str(o.notes, 200) };
}

export default async function handler(req, res) {
  const send = responder(res);
  if (req.method !== 'POST') return send(405, { error: 'POST only' });
  if (!authorized(req)) return send(401, { error: 'Access code missing or wrong.', code: 'access_code' });
  if (limited(clientIp(req))) return send(429, { error: 'Too many requests. Try again in a while.', code: 'busy' });
  const body = readBody(req);
  if (!body || typeof body.image !== 'string' || !TYPES.has(body.mediaType)) return send(400, { error: 'Send a JPEG, PNG or WebP image.', code: 'bad_request' });
  const data = body.image.replace(/^data:[^,]+,/, '');
  if (data.length < 200 || data.length > MAX_IMAGE_B64 || !/^[A-Za-z0-9+/=\s]+$/.test(data.slice(0, 400))) return send(400, { error: 'Image is missing or too large.', code: 'too_large' });
  const hint = typeof body.currency === 'string' ? body.currency.slice(0, 3) : '';
  try {
    const text = await askClaude({
      system: SYSTEM,
      image: { mediaType: body.mediaType, data },
      user: `Read this receipt.${hint ? ` The user's main currency is ${hint}; use it if the receipt doesn't state one.` : ''}`,
      maxTokens: 3500,
    });
    return send(200, shape(extractJson(text)));
  } catch (e) {
    if (e?.code === 'not_a_receipt') return send(422, { error: 'That doesn’t look like a receipt.', code: 'not_a_receipt' });
    return failure(send, e);
  }
}
