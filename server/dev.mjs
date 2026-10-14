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
const { default: handler } = await import('./api/debt-coach.mjs');

http
  .createServer((req, res) => {
    if (req.url !== '/api/debt-coach') {
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
