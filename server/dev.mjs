// Local runner: `node dev.mjs` (reads server/.env). For production deploy this folder to Vercel instead.
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const envFile = join(here, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const routes = {
  '/api/debt-coach': (await import('../api/debt-coach.mjs')).default,
  '/api/budget-coach': (await import('../api/budget-coach.mjs')).default,
  '/api/receipt-scan': (await import('../api/receipt-scan.mjs')).default,
};

http
  .createServer((req, res) => {
    // Local testing only: the web preview runs on another port, so allow cross-origin calls.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, x-access-code');
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      return res.end();
    }
    const handler = routes[req.url];
    if (!handler) {
      res.statusCode = 404;
      return res.end('not found');
    }
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try { req.body = raw ? JSON.parse(raw) : undefined; } catch { req.body = raw; }
      handler(req, res);
    });
  })
  .listen(8787, () => console.log('Debt coach proxy on http://localhost:8787/api/debt-coach'));
