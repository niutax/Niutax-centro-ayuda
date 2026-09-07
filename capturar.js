#!/usr/bin/env node
/**
 * capturar.js — incorpora capturas y textos tomados desde el ERP a los artículos.
 *
 * Uso individual:
 *   node capturar.js <slug-articulo> <n-paso> <ruta-imagen> \
 *        [--alt "texto alternativo"] [--desc "pie de imagen"] [--texto "cuerpo del paso"]
 *
 * Uso por lote (lo que produce una sesión de captura con el plugin de Chrome):
 *   node capturar.js --lote lote.json
 *
 *   lote.json = {
 *     "articulo": "emitir-factura-electronica",
 *     "fuente": "https://app.niutax.cl/comercial/documentos/nuevo",
 *     "pasos": [
 *       { "n": 1, "imagen": "/ruta/captura-1.png", "alt": "...", "desc": "...", "texto": "..." }
 *     ]
 *   }
 *
 * Opciones extra: --estado revisado|publicado
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CONTENT = path.join(ROOT, 'content');
const CAPTURAS = path.join(ROOT, 'assets', 'capturas');
const HOY = new Date().toISOString().slice(0, 10);

function ubicarArticulo(slug) {
  const cats = JSON.parse(fs.readFileSync(path.join(CONTENT, 'categorias.json'), 'utf8'));
  for (const c of cats) {
    const p = path.join(CONTENT, 'articulos', c.id, slug + '.json');
    if (fs.existsSync(p)) return { ruta: p, cat: c.id };
  }
  return null;
}

function aplicar(slug, pasos, { fuente, estado } = {}) {
  const loc = ubicarArticulo(slug);
  if (!loc) throw new Error(`No existe el artículo "${slug}". Revisa content/articulos/*/`);
  const art = JSON.parse(fs.readFileSync(loc.ruta, 'utf8'));
  const destino = path.join(CAPTURAS, loc.cat);
  fs.mkdirSync(destino, { recursive: true });

  for (const p of pasos) {
    const paso = art.pasos.find((x) => x.n === Number(p.n));
    if (!paso) throw new Error(`El artículo "${slug}" no tiene paso ${p.n} (tiene ${art.pasos.length}).`);

    if (p.imagen) {
      if (!fs.existsSync(p.imagen)) throw new Error(`No encuentro la imagen ${p.imagen}`);
      const ext = path.extname(p.imagen).toLowerCase() || '.png';
      const archivo = `${slug}-${String(p.n).padStart(2, '0')}${ext}`;
      fs.copyFileSync(p.imagen, path.join(destino, archivo));
      paso.captura = {
        archivo,
        alt: p.alt || paso.titulo,
        descripcion: p.desc || null,
      };
      console.log(`  ✓ paso ${p.n}: captura → assets/capturas/${loc.cat}/${archivo}`);
    }
    if (p.texto) {
      paso.cuerpo = p.texto;
      console.log(`  ✓ paso ${p.n}: texto actualizado`);
    }
    if (p.titulo) paso.titulo = p.titulo;
    if (p.nota) paso.nota = p.nota;
  }

  if (fuente) art.fuente = { url: fuente, capturadoEl: HOY };
  if (estado) art.estado = estado;
  art.actualizado = HOY;
  fs.writeFileSync(loc.ruta, JSON.stringify(art, null, 2) + '\n');

  const conCaptura = art.pasos.filter((p) => p.captura).length;
  console.log(`✓ ${slug}: ${conCaptura}/${art.pasos.length} pasos con captura · estado "${art.estado}"`);
  console.log('  Ejecuta `node build.js` para regenerar el sitio.');
}

// ------------------------------------------------------------------ CLI
const argv = process.argv.slice(2);
function opt(nombre) {
  const i = argv.indexOf('--' + nombre);
  return i > -1 ? argv[i + 1] : null;
}

try {
  if (argv.includes('--lote')) {
    const lote = JSON.parse(fs.readFileSync(opt('lote'), 'utf8'));
    aplicar(lote.articulo, lote.pasos || [], { fuente: lote.fuente, estado: lote.estado || opt('estado') });
  } else {
    const posicionales = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
    const [s, paso, img] = posicionales;
    if (!s || !paso) {
      console.log('Uso: node capturar.js <slug> <n-paso> <imagen> [--alt ..] [--desc ..] [--texto ..]');
      console.log('     node capturar.js --lote lote.json');
      process.exit(1);
    }
    aplicar(s, [{ n: paso, imagen: img, alt: opt('alt'), desc: opt('desc'), texto: opt('texto') }], {
      fuente: opt('fuente'),
      estado: opt('estado'),
    });
  }
} catch (e) {
  console.error('✗ ' + e.message);
  process.exit(1);
}
