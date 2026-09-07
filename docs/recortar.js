/**
 * Recorta el espacio muerto alrededor de las capturas del ERP (los cuatro lados).
 *
 * Lección: `sips -c … --cropOffset 0 0` NO ancla en la esquina superior izquierda,
 * recorta desde el centro. Por eso el recorte geométrico se hace aquí en Node sobre
 * píxeles decodificados; `sips` solo convierte de formato (JPEG→PNG para analizar,
 * PNG→JPEG para guardar). Las capturas se llaman .png pero son JPEG: se conserva así.
 *
 * Fuente: por defecto el archivo actual. Con --desde-tmp usa la copia PNG original que
 * quedó en tmp-recorte/ (recuperación tras un recorte fallido).
 */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { execFileSync } = require('child_process');
const TMP = require('path').join(require('os').tmpdir(), 'recorte-capturas');
fs.mkdirSync(TMP, { recursive: true });
const MARGEN = 8, TOL = 14;
const args = process.argv.slice(2);
const desdeTmp = args.includes('--desde-tmp');
const archivos = args.filter(a => !a.startsWith('--'));

function decodePNG(f) {
  const b = fs.readFileSync(f);
  const W = b.readUInt32BE(16), H = b.readUInt32BE(20), depth = b[24], ct = b[25];
  if (depth !== 8 || (ct !== 2 && ct !== 6) || b[28] !== 0) throw new Error(`png no soportado ct=${ct} depth=${depth}`);
  const BPP = ct === 6 ? 4 : 3;
  let i = 8, idat = [];
  while (i < b.length) { const l = b.readUInt32BE(i), t = b.toString('ascii', i + 4, i + 8); if (t === 'IDAT') idat.push(b.slice(i + 8, i + 8 + l)); if (t === 'IEND') break; i += 12 + l; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), S = W * BPP, px = Buffer.alloc(H * S);
  const pae = (a, b2, c) => { const p = a + b2 - c, pa = Math.abs(p - a), pb = Math.abs(p - b2), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b2 : c; };
  for (let y = 0; y < H; y++) {
    const f2 = raw[y * (S + 1)], ln = raw.slice(y * (S + 1) + 1, y * (S + 1) + 1 + S);
    for (let x = 0; x < S; x++) {
      const a = x >= BPP ? px[y * S + x - BPP] : 0, up = y > 0 ? px[(y - 1) * S + x] : 0, c = x >= BPP && y > 0 ? px[(y - 1) * S + x - BPP] : 0;
      let v = ln[x]; if (f2 === 1) v += a; else if (f2 === 2) v += up; else if (f2 === 3) v += (a + up) >> 1; else if (f2 === 4) v += pae(a, up, c);
      px[y * S + x] = v & 0xff;
    }
  }
  return { W, H, px, S, BPP };
}

function bordes(img) {
  const { W, H, px, S, BPP } = img;
  const bg = [px[(H - 1) * S + (W - 1) * BPP], px[(H - 1) * S + (W - 1) * BPP + 1], px[(H - 1) * S + (W - 1) * BPP + 2]];
  const difiere = (x, y) => { const o = y * S + x * BPP; return Math.abs(px[o] - bg[0]) > TOL || Math.abs(px[o + 1] - bg[1]) > TOL || Math.abs(px[o + 2] - bg[2]) > TOL; };
  let x0 = -1, x1 = -1, y0 = -1, y1 = -1;
  for (let x = 0; x < W && x0 < 0; x++) for (let y = 0; y < H; y++) if (difiere(x, y)) { x0 = x; break; }
  for (let x = W - 1; x >= 0 && x1 < 0; x--) for (let y = 0; y < H; y++) if (difiere(x, y)) { x1 = x; break; }
  for (let y = 0; y < H && y0 < 0; y++) for (let x = 0; x < W; x++) if (difiere(x, y)) { y0 = y; break; }
  for (let y = H - 1; y >= 0 && y1 < 0; y--) for (let x = 0; x < W; x++) if (difiere(x, y)) { y1 = y; break; }
  return { x0: Math.max(0, x0 - MARGEN), y0: Math.max(0, y0 - MARGEN), x1: Math.min(W - 1, x1 + MARGEN), y1: Math.min(H - 1, y1 + MARGEN), W, H };
}

function encodePNG(img, r) {
  const { px, S, BPP } = img; const CW = r.x1 - r.x0 + 1, CH = r.y1 - r.y0 + 1;
  const out = Buffer.alloc(CH * (CW * 3 + 1));
  for (let y = 0; y < CH; y++) { out[y * (CW * 3 + 1)] = 0; for (let x = 0; x < CW; x++) { const s = (y + r.y0) * S + (x + r.x0) * BPP, d = y * (CW * 3 + 1) + 1 + x * 3; out[d] = px[s]; out[d + 1] = px[s + 1]; out[d + 2] = px[s + 2]; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(CW, 0); ihdr.writeUInt32BE(CH, 4); ihdr[8] = 8; ihdr[9] = 2;
  const tab = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; tab[n] = c >>> 0; }
  const crc = (b) => { let c = 0xffffffff; for (const v of b) c = tab[(c ^ v) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length, 0); const tb = Buffer.from(t, 'ascii'); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([tb, d])), 0); return Buffer.concat([l, tb, d, c]); };
  return { buf: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(out, { level: 6 })), chunk('IEND', Buffer.alloc(0))]), CW, CH };
}

function dimsJpegOPng(f) { const b = fs.readFileSync(f); if (b[0] === 0x89) return [b.readUInt32BE(16), b.readUInt32BE(20)]; let i = 2; while (i < b.length - 9) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1]; if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + b.readUInt16BE(i + 2); } return [0, 0]; }

for (const f of archivos) {
  try {
    const base = path.basename(f), png = path.join(TMP, base + '.png');
    if (!(desdeTmp && fs.existsSync(png))) execFileSync('sips', ['-s', 'format', 'png', f, '--out', png], { stdio: 'ignore' });
    const img = decodePNG(png), r = bordes(img);
    const quita = r.x0 + (r.W - 1 - r.x1) + r.y0 + (r.H - 1 - r.y1);
    if (quita <= 20 && !desdeTmp) { console.log(`= ${base} ${r.W}x${r.H} sin recorte`); continue; }
    const { buf, CW, CH } = encodePNG(img, r);
    const cropPng = path.join(TMP, base + '.crop.png'), outJpg = path.join(TMP, base + '.crop.jpg');
    fs.writeFileSync(cropPng, buf);
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '88', cropPng, '--out', outJpg], { stdio: 'ignore' });
    const [ow, oh] = dimsJpegOPng(outJpg);
    if (ow !== CW || oh !== CH) { console.log(`! ${base} salida ${ow}x${oh} ≠ ${CW}x${CH}: NO se toca`); continue; }
    fs.copyFileSync(outJpg, f);
    console.log(`✂ ${base} ${r.W}x${r.H} → ${CW}x${CH}  (x${r.x0}..${r.x1} y${r.y0}..${r.y1})`);
  } catch (e) { console.log(`! ${path.basename(f)}: ${e.message}`); }
}
