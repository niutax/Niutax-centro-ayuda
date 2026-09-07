/**
 * Prepara los dos logotipos del encabezado a partir del original de marketing
 * (texto blanco, 1200x630 con mucho aire alrededor).
 *
 *  - logo-oscuro.png : el original recortado a su contenido real.
 *  - logo-claro.png  : el mismo, con el texto pasado a negro. Solo se recolorean los
 *    píxeles A LA DERECHA del icono, para no tocar el visto blanco ni el borde verde.
 *    Se preserva el alfa, así que el antialias del texto se mantiene limpio.
 *
 * PNG RGBA de 8 bits sin entrelazar: se decodifica con zlib, se deshacen los filtros
 * por línea, se edita y se vuelve a codificar con filtro 0.
 */
const fs = require('fs');
const zlib = require('zlib');

const ORIGEN = process.argv[2] || require('path').join(require('os').homedir(), 'Desktop', 'Marketing Niutax', 'Logo Niutax transparente texto blanco.png');
const DESTINO = require('path').join(__dirname, '..', 'assets');

const buf = fs.readFileSync(ORIGEN);
const W = buf.readUInt32BE(16), H = buf.readUInt32BE(20);
if (buf[24] !== 8 || buf[25] !== 6 || buf[28] !== 0) throw new Error('se esperaba RGBA8 sin entrelazar');

// --- juntar IDAT e inflar
let i = 8, idat = [];
while (i < buf.length) {
  const len = buf.readUInt32BE(i), tipo = buf.toString('ascii', i + 4, i + 8);
  if (tipo === 'IDAT') idat.push(buf.slice(i + 8, i + 8 + len));
  if (tipo === 'IEND') break;
  i += 12 + len;
}
const raw = zlib.inflateSync(Buffer.concat(idat));

// --- deshacer filtros (spec PNG: 0 none, 1 sub, 2 up, 3 average, 4 paeth)
const BPP = 4, STRIDE = W * BPP;
const px = Buffer.alloc(H * STRIDE);
function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}
for (let y = 0; y < H; y++) {
  const f = raw[y * (STRIDE + 1)];
  const linea = raw.slice(y * (STRIDE + 1) + 1, y * (STRIDE + 1) + 1 + STRIDE);
  for (let x = 0; x < STRIDE; x++) {
    const a = x >= BPP ? px[y * STRIDE + x - BPP] : 0;
    const b = y > 0 ? px[(y - 1) * STRIDE + x] : 0;
    const c = x >= BPP && y > 0 ? px[(y - 1) * STRIDE + x - BPP] : 0;
    let v = linea[x];
    if (f === 1) v += a; else if (f === 2) v += b;
    else if (f === 3) v += (a + b) >> 1; else if (f === 4) v += paeth(a, b, c);
    px[y * STRIDE + x] = v & 0xff;
  }
}

// --- caja del contenido (alfa > 8) y hueco entre icono y texto
const colTiene = new Array(W).fill(false);
let x0 = W, x1 = -1, y0 = H, y1 = -1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (px[y * STRIDE + x * BPP + 3] > 8) {
    colTiene[x] = true;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
}
// primer tramo vacío de al menos 12 px después del icono → separa icono de texto
let corte = -1, vacio = 0;
for (let x = x0; x <= x1; x++) {
  if (!colTiene[x]) { vacio++; if (vacio >= 12) { corte = x; } }
  else { if (corte > 0) break; vacio = 0; }
}
console.log(`contenido: x ${x0}..${x1}  y ${y0}..${y1}  (${x1 - x0 + 1}x${y1 - y0 + 1})`);
console.log(`corte icono/texto en x=${corte}`);

// --- recortar (con un pequeño margen) y opcionalmente ennegrecer el texto
const M = 6;
const cx0 = Math.max(0, x0 - M), cx1 = Math.min(W - 1, x1 + M);
const cy0 = Math.max(0, y0 - M), cy1 = Math.min(H - 1, y1 + M);
const CW = cx1 - cx0 + 1, CH = cy1 - cy0 + 1;

function generar(ennegrecerTexto) {
  const out = Buffer.alloc(CH * (CW * BPP + 1));
  for (let y = 0; y < CH; y++) {
    out[y * (CW * BPP + 1)] = 0; // filtro none
    for (let x = 0; x < CW; x++) {
      const s = (y + cy0) * STRIDE + (x + cx0) * BPP;
      const d = y * (CW * BPP + 1) + 1 + x * BPP;
      const a = px[s + 3];
      const esTexto = ennegrecerTexto && corte > 0 && (x + cx0) > corte;
      out[d] = esTexto && a > 0 ? 0 : px[s];
      out[d + 1] = esTexto && a > 0 ? 0 : px[s + 1];
      out[d + 2] = esTexto && a > 0 ? 0 : px[s + 2];
      out[d + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(CW, 0); ihdr.writeUInt32BE(CH, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const crcTab = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTab[n] = c >>> 0; }
  const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcTab[(c ^ v) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (tipo, data) => {
    const l = Buffer.alloc(4); l.writeUInt32BE(data.length, 0);
    const t = Buffer.from(tipo, 'ascii');
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, data])), 0);
    return Buffer.concat([l, t, data, c]);
  };
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(out, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.writeFileSync(DESTINO + '/logo-oscuro.png', generar(false));
fs.writeFileSync(DESTINO + '/logo-claro.png', generar(true));
console.log(`escritos ${CW}x${CH} (proporción ${(CW / CH).toFixed(2)})`);
