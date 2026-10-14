// Generates the app icon + splash mark procedurally (no image dependencies).
const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  let c, crc = ~0;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

function render(size, { background }) {
  const buf = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const R = size * 0.285, W = size * 0.085;           // ring radius / thickness
  const gapStart = -Math.PI * 0.12, gapEnd = Math.PI * 0.42; // open arc where the "job" dot sits
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const t = (x + y) / (2 * size);
    let r = 0, g = 0, b = 0, a = 0;
    if (background) { r = mix(18, 6, t); g = mix(196, 98, t); b = mix(144, 74, t); a = 255; }
    const dx = x - c, dy = y - c, d = Math.hypot(dx, dy);
    let ang = Math.atan2(dy, dx);
    const ringCov = 1 - smooth(W / 2 - 1.5, W / 2 + 1.5, Math.abs(d - R));
    const TAU = Math.PI * 2;
    const gapLen = gapEnd - gapStart;
    const u = (((ang - gapStart) % TAU) + TAU) % TAU;
    const inGap = u < gapLen;
    const edgePx = (inGap ? Math.min(u, gapLen - u) : Math.min(u - gapLen, TAU - u)) * d;
    const angCov = smooth(-1.5, 1.5, inGap ? -edgePx : edgePx);
    const cov = ringCov * angCov;
    // centre dot
    const dot = 1 - smooth(size * 0.07 - 1.5, size * 0.07 + 1.5, d);
    // detached accent dot sitting in the gap
    const gx = c + Math.cos((gapStart + gapEnd) / 2) * R, gy = c + Math.sin((gapStart + gapEnd) / 2) * R;
    const gd = Math.hypot(x - gx, y - gy);
    const gdot = 1 - smooth(size * 0.052 - 1.5, size * 0.052 + 1.5, gd);
    const m = Math.max(cov, dot * 0.0, gdot);
    const white = Math.min(1, Math.max(m, dot));
    r = mix(r, 255, white); g = mix(g, 255, white); b = mix(b, 255, white);
    a = background ? 255 : Math.round(255 * white);
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
  }
  return png(size, size, buf);
}
fs.writeFileSync('assets/icon.png', render(1024, { background: true }));
fs.writeFileSync('assets/splash-icon.png', render(512, { background: false }));
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/apple-touch-icon.png', render(180, { background: true }));
fs.writeFileSync('public/icon-192.png', render(192, { background: true }));
fs.writeFileSync('public/icon-512.png', render(512, { background: true }));
fs.writeFileSync('public/favicon.png', render(48, { background: true }));
console.log('icons written');
