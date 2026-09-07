#!/usr/bin/env node
// Generador estático del Centro de Ayuda Niutax ERP.
// Lee content/ y escribe public/. No requiere dependencias externas.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CONTENT = path.join(ROOT, 'content');
const OUT = path.join(ROOT, 'public');
const SITIO = {
  nombre: 'Centro de Ayuda',
  marca: 'Niutax ERP',
  url: 'https://docs.niu.tax',
  soporte: 'soporte@niutax.cl',
  anio: new Date().getFullYear(),
};

// ---------------------------------------------------------------- utilidades
const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Formato mínimo dentro de los textos: `código`, **negrita**, [texto](url)
const rich = (s = '') =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

const ICONOS = {
  contabilidad:
    '<path d="M3 3h18v4H3zM5 10h4v4H5zm6 0h4v4h-4zm6 0h2v11h-2zM5 16h4v5H5zm6 0h4v5h-4z"/>',
  rrhh:
    '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM1 21v-1.5C1 16.46 4.58 15 9 15s8 1.46 8 4.5V21zm18 0v-1.5c0-1.9-.85-3.29-2.2-4.2 3 .28 6.2 1.6 6.2 4.2V21z"/>',
  comercial:
    '<path d="M4 2h16a1 1 0 0 1 1 1v19l-3-2-3 2-3-2-3 2-3-2-3 2V3a1 1 0 0 1 1-1zm3 5v2h10V7zm0 4v2h10v-2zm0 4v2h6v-2z"/>',
  tributaria:
    '<path d="M12 2 3 6v2h18V6zm-7 8v7H3v2h18v-2h-2v-7h-2v7h-3v-7h-2v7H7v-7z"/>',
};

// Dimensiones reales de la imagen (PNG/JPEG) para declarar width/height y evitar
// que el layout salte al cargar: sin esto los enlaces #paso-N quedan desplazados.
function dimensionesImagen(archivo) {
  try {
    const b = fs.readFileSync(archivo);
    if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  } catch (e) {}
  return null;
}

const rutaCaptura = (cat, archivo) => path.join(OUT, 'assets', 'capturas', cat, archivo);

const capturasDe = (art) => art.pasos.filter((p) => p.captura).length;
const totalPasos = (art) => art.pasos.length;

// ---------------------------------------------------------------- carga
function cargar() {
  const categorias = JSON.parse(fs.readFileSync(path.join(CONTENT, 'categorias.json'), 'utf8'));
  const articulos = [];
  for (const cat of categorias) {
    const dir = path.join(CONTENT, 'articulos', cat.id);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const art = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      art.categoria = art.categoria || cat.id;
      articulos.push(art);
    }
  }
  articulos.sort((a, b) => (a.orden || 99) - (b.orden || 99));
  return { categorias, articulos };
}

// Versión de los assets (mtime) para que el navegador no sirva CSS/JS viejo.
const versionAsset = (f) => {
  try {
    return Math.floor(fs.statSync(path.join(ROOT, 'assets', f)).mtimeMs).toString(36);
  } catch (e) {
    return '1';
  }
};
const V_CSS = versionAsset('styles.css');
const V_JS = versionAsset('app.js');

// ---------------------------------------------------------------- plantillas
// Logo de marca. Se usan dos archivos porque el logotipo lleva el texto quemado en
// la imagen: la versión de texto negro es ilegible sobre el fondo oscuro y la de texto
// blanco desaparece sobre el claro. El intercambio lo hace el CSS, no JS, para que el
// logo correcto ya esté pintado en el primer frame.
// Si los archivos no están, se cae al escudo SVG + texto de siempre: así el encabezado
// nunca queda roto por un asset faltante.
// Se acepta png, svg o webp: basta con dejar el archivo en assets/ con el nombre base.
const buscarLogo = (nombre) =>
  ['svg', 'png', 'webp'].map((e) => `${nombre}.${e}`).find((f) => fs.existsSync(path.join(ROOT, 'assets', f))) || null;
const LOGO_CLARO = buscarLogo('logo-claro');   // texto negro  → vista clara
const LOGO_OSCURO = buscarLogo('logo-oscuro'); // texto blanco → vista oscura
const hayLogo = Boolean(LOGO_CLARO && LOGO_OSCURO);
const dimLogo = hayLogo && !LOGO_CLARO.endsWith('.svg')
  ? dimensionesImagen(path.join(ROOT, 'assets', LOGO_CLARO))
  : null;

const logo = (base) => {
  if (!hayLogo) {
    return `<a class="marca" href="${base}/">
  <span class="marca-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
  <span class="marca-txt"><b>Niutax</b> ERP<em>Centro de Ayuda</em></span>
</a>`;
  }
  // Alto fijo en CSS (28px); el ancho se deriva de la proporción real del archivo
  // para declarar width/height y no provocar salto de layout al cargar.
  const alto = 28;
  const ancho = dimLogo ? Math.round((dimLogo.w / dimLogo.h) * alto) : 79;
  const img = (archivo, clase) =>
    `<img class="marca-logo ${clase}" src="${base}/assets/${archivo}?v=${versionAsset(archivo)}"` +
    ` alt="Niutax ERP" width="${ancho}" height="${alto}" decoding="async">`;
  return `<a class="marca marca-img" href="${base}/" aria-label="Niutax ERP · Centro de Ayuda">
  ${img(LOGO_CLARO, 'solo-claro')}
  ${img(LOGO_OSCURO, 'solo-oscuro')}
  <span class="marca-sub">Centro de Ayuda</span>
</a>`;
};

function layout({ titulo, descripcion, contenido, base = '', cat = null, canonical = '', clase = '', jsonld = '' }) {
  return `<!doctype html>
<html lang="es-CL"${cat ? ` data-cat="${cat.id}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · ${SITIO.nombre} ${SITIO.marca}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${SITIO.url}${canonical}">
<meta property="og:title" content="${esc(titulo)} · ${SITIO.nombre} ${SITIO.marca}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:type" content="article">
<meta property="og:locale" content="es_CL">
<link rel="icon" href="${base}/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${base}/assets/styles.css?v=${V_CSS}">
<script>try{var t=localStorage.getItem('niutax-help-tema');if(t)document.documentElement.dataset.tema=t;}catch(e){}</script>
${cat ? `<style>:root{--acento:${cat.color};--acento-rgb:${cat.colorRgb}}</style>` : ''}
${jsonld ? `<script type="application/ld+json">${jsonld}</script>` : ''}
</head>
<body class="${clase}">
<a class="skip" href="#main">Ir al contenido</a>
<header class="top">
  <div class="wrap top-in">
    ${logo(base)}
    <div class="buscador" role="search">
      <svg class="lupa" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm8.6 14.2-3.3-3.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <input id="q" type="search" placeholder="Buscar en la ayuda…" autocomplete="off" aria-label="Buscar en el centro de ayuda">
      <kbd>/</kbd>
      <div id="resultados" class="resultados" hidden></div>
    </div>
    <nav class="top-nav">
      <a href="${base}/estado">Estado</a>
      <a class="btn-ghost" href="https://central.niu.tax" target="_blank" rel="noopener">Ir a Niutax ERP</a>
      <button class="tema" id="tema" type="button" aria-label="Cambiar tema">
        <svg viewBox="0 0 24 24" class="i-sol" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 1v3m0 16v3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M1 12h3m16 0h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
        <svg viewBox="0 0 24 24" class="i-luna" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>
      </button>
    </nav>
  </div>
</header>
<main id="main">
${contenido}
</main>
<footer class="pie">
  <div class="wrap pie-in">
    <div>
      <p class="pie-marca"><b>Niutax</b> ERP · Centro de Ayuda</p>
      <p class="pie-nota">¿No encontraste lo que buscabas? Escríbenos a <a href="mailto:${SITIO.soporte}">${SITIO.soporte}</a></p>
    </div>
    <nav class="pie-links" aria-label="Categorías">
      <a href="${base}/c/niudata">Contabilidad y Finanzas</a>
      <a href="${base}/c/niuhr">Gestión de RRHH</a>
      <a href="${base}/c/niupos">Gestión Comercial</a>
      <a href="${base}/c/niutax">Gestión Tributaria</a>
    </nav>
    <p class="pie-copy">© ${SITIO.anio} Niutax — Autonomía Total.</p>
  </div>
</footer>
<script>window.HELP_BASE=${JSON.stringify(base)};</script>
<script src="${base}/assets/app.js?v=${V_JS}"></script>
</body>
</html>
`;
}

const tarjetaCat = (cat, base, n) => `<a class="cat-card" href="${base}/c/${cat.id}" style="--acento:${cat.color};--acento-rgb:${cat.colorRgb}">
  <span class="cat-ico" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONOS[cat.icono]}</svg></span>
  <span class="cat-kicker">${esc(cat.producto)}</span>
  <h3>${esc(cat.nombre)}</h3>
  <p>${esc(cat.tagline)}</p>
  <span class="cat-meta">${n} ${n === 1 ? 'artículo' : 'artículos'} <svg viewBox="0 0 24 24" class="flecha" aria-hidden="true"><path d="M5 12h13m-5-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
</a>`;

// ---------------------------------------------------------------- portada
function portada({ categorias, articulos }) {
  const base = '';
  const porCat = (id) => articulos.filter((a) => a.categoria === id);
  const inicio = articulos.filter((a) => a.tipo === 'concepto');
  const populares = ['declarar-formulario-29', 'emitir-factura-electronica', 'procesar-liquidaciones-de-sueldo', 'conciliacion-bancaria', 'generar-balance-8-columnas', 'contratos-y-anexos-con-firma-electronica']
    .map((s) => articulos.find((a) => a.slug === s))
    .filter(Boolean);
  const mapa = (id) => categorias.find((c) => c.id === id);

  const contenido = `
<section class="hero">
  <div class="wrap">
    <p class="eyebrow">Centro de Ayuda</p>
    <h1>¿En qué te ayudamos con <span>Niutax ERP</span>?</h1>
    <p class="hero-sub">Guías paso a paso de cada proceso y para qué sirve cada módulo del ERP.</p>
    <form class="hero-buscar" role="search" onsubmit="return false">
      <svg class="lupa" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm8.6 14.2-3.3-3.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <input id="q-hero" type="search" placeholder="Buscar: F29, liquidaciones, conciliación bancaria…" autocomplete="off" aria-label="Buscar en el centro de ayuda">
      <div id="resultados-hero" class="resultados" hidden></div>
    </form>
    <p class="hero-tags">Populares: ${populares.slice(0, 4).map((a) => `<a href="/a/${a.slug}">${esc(a.titulo)}</a>`).join('')}</p>
  </div>
</section>

<section class="wrap seccion">
  <h2 class="titulo-seccion">Explora por módulo</h2>
  <div class="cat-grid">${categorias.map((c) => tarjetaCat(c, base, porCat(c.id).length)).join('')}</div>
</section>

<section class="wrap seccion">
  <h2 class="titulo-seccion">Primeros pasos</h2>
  <p class="sub-seccion">Si recién partes, estos artículos explican para qué sirve cada módulo.</p>
  <div class="lista-grid">
    ${inicio.map((a) => {
      const c = mapa(a.categoria);
      return `<a class="art-card" href="/a/${a.slug}" style="--acento:${c.color};--acento-rgb:${c.colorRgb}">
      <span class="chip">${esc(c.producto)}</span>
      <h3>${esc(a.titulo)}</h3><p>${esc(a.resumen)}</p><span class="art-meta">${esc(a.tiempoLectura)} de lectura</span></a>`;
    }).join('')}
  </div>
</section>

<section class="wrap seccion">
  <h2 class="titulo-seccion">Procesos más consultados</h2>
  <ul class="lista-simple">
    ${populares.map((a) => {
      const c = mapa(a.categoria);
      return `<li><a href="/a/${a.slug}"><span class="punto" style="background:${c.color}"></span><b>${esc(a.titulo)}</b><em>${esc(c.nombre)}</em></a></li>`;
    }).join('')}
  </ul>
</section>

<section class="wrap seccion">
  <div class="aviso-panel">
    <h2>¿Necesitas ayuda de una persona?</h2>
    <p>Escríbenos a <a href="mailto:${SITIO.soporte}">${SITIO.soporte}</a> con el RUT de tu empresa y una captura de lo que estás viendo. Te respondemos en horario hábil.</p>
  </div>
</section>`;

  const jsonld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: `${SITIO.nombre} ${SITIO.marca}`,
    url: SITIO.url,
    inLanguage: 'es-CL',
  });

  return layout({
    titulo: 'Inicio',
    descripcion: 'Guías paso a paso de Niutax ERP: contabilidad y finanzas, RRHH, gestión comercial y tributaria.',
    contenido,
    canonical: '/',
    clase: 'p-inicio',
    jsonld,
  });
}

// ---------------------------------------------------------------- categoría
function paginaCategoria(cat, articulos) {
  const base = '..';
  const arts = articulos.filter((a) => a.categoria === cat.id);
  const secciones = cat.secciones.filter((s) => arts.some((a) => a.seccion === s));
  const sueltos = arts.filter((a) => !cat.secciones.includes(a.seccion));

  const bloque = (nombre, lista) => `<section class="bloque">
    <h2>${esc(nombre)}</h2>
    <div class="lista-grid">
      ${lista.map((a) => `<a class="art-card" href="${base}/a/${a.slug}">
        <h3>${esc(a.titulo)}</h3><p>${esc(a.resumen)}</p>
        <span class="art-meta">${esc(a.tiempoLectura)}${a.estado !== 'publicado' ? ` · <b class="est est-${esc(a.estado)}">${esc(a.estado)}</b>` : ''}</span></a>`).join('')}
    </div>
  </section>`;

  const contenido = `
<div class="cab-cat">
  <div class="wrap">
    <nav class="migas"><a href="${base}/">Centro de Ayuda</a> <span>/</span> ${esc(cat.nombre)}</nav>
    <div class="cab-cat-in">
      <span class="cat-ico grande" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONOS[cat.icono]}</svg></span>
      <div>
        <h1>${esc(cat.nombre)} <em>${esc(cat.producto)}</em></h1>
        <p>${esc(cat.descripcion)}</p>
      </div>
    </div>
  </div>
</div>
<div class="wrap seccion">
  ${secciones.map((s) => bloque(s, arts.filter((a) => a.seccion === s))).join('')}
  ${sueltos.length ? bloque('Otros', sueltos) : ''}
</div>`;

  return layout({
    titulo: `${cat.nombre} (${cat.producto})`,
    descripcion: cat.descripcion,
    contenido,
    base,
    cat,
    canonical: `/c/${cat.id}`,
    clase: 'p-categoria',
  });
}

// ---------------------------------------------------------------- artículo
function paginaArticulo(art, cat, articulos) {
  const base = '..';
  const rel = (art.relacionados || []).map((s) => articulos.find((a) => a.slug === s)).filter(Boolean);

  // Un paso sin captura no muestra nada al lector: el pendiente se controla en /estado.
  const figura = (p) => {
    const ruta = rutaCaptura(art.categoria, p.captura.archivo);
    if (!fs.existsSync(ruta)) {
      console.warn(`  ! ${art.slug} paso ${p.n}: falta la imagen ${p.captura.archivo}`);
      return '';
    }
    const d = dimensionesImagen(ruta);
    return `<figure class="captura"><img src="${base}/assets/capturas/${art.categoria}/${esc(p.captura.archivo)}" alt="${esc(
      p.captura.alt || p.titulo
    )}"${d ? ` width="${d.w}" height="${d.h}"` : ''} loading="lazy">${
      p.captura.descripcion ? `<figcaption>${rich(p.captura.descripcion)}</figcaption>` : ''
    }</figure>`;
  };

  const paso = (p) => `<li class="paso" id="paso-${p.n}">
    <div class="paso-cab"><span class="paso-n">${p.n}</span><h3>${esc(p.titulo)}</h3></div>
    <div class="paso-cuerpo">
      <p>${rich(p.cuerpo)}</p>
      ${p.nota ? `<p class="nota"><b>Nota:</b> ${rich(p.nota)}</p>` : ''}
      ${p.captura ? figura(p) : ''}
    </div>
  </li>`;

  const contenido = `
<div class="art-layout wrap">
  <article class="art">
    <nav class="migas"><a href="${base}/">Centro de Ayuda</a> <span>/</span> <a href="${base}/c/${cat.id}">${esc(cat.nombre)}</a> <span>/</span> ${esc(art.seccion)}</nav>
    <h1>${esc(art.titulo)}</h1>
    <p class="art-resumen">${esc(art.resumen)}</p>
    <div class="art-datos">
      <span class="chip">${esc(cat.producto)}</span>
      <span>${esc(art.tiempoLectura)} de lectura</span>
      <span>Actualizado ${esc(art.actualizado)}</span>
      ${
        art.estado === 'borrador'
          ? `<span class="badge-estado badge-borrador" title="Contenido base, pendiente de validar contra el ERP">Borrador</span>`
          : art.estado === 'revisado'
            ? `<span class="badge-estado badge-revisado" title="Verificado contra la interfaz real del ERP">Revisado en el ERP</span>`
            : ''
      }
    </div>

    <section class="caja proposito" id="para-que-sirve">
      <h2>Para qué sirve</h2>
      <p>${rich(art.proposito)}</p>
      ${art.publicoObjetivo?.length ? `<p class="dirigido"><b>Dirigido a:</b> ${art.publicoObjetivo.map((p) => `<span>${esc(p)}</span>`).join('')}</p>` : ''}
    </section>

    ${
      art.requisitos?.length
        ? `<section class="caja requisitos" id="antes-de-empezar">
      <h2>Antes de empezar</h2>
      <ul>${art.requisitos.map((r) => `<li>${rich(r)}</li>`).join('')}</ul>
    </section>`
        : ''
    }

    <section id="paso-a-paso">
      <h2 class="h-pasos">Paso a paso</h2>
      <ol class="pasos">${art.pasos.map(paso).join('')}</ol>
    </section>

    ${
      art.tips?.length
        ? `<section class="caja tip" id="recomendaciones">
      <h2>Recomendaciones</h2>
      <ul>${art.tips.map((t) => `<li>${rich(t)}</li>`).join('')}</ul>
    </section>`
        : ''
    }

    ${
      art.faq?.length
        ? `<section id="preguntas">
      <h2>Preguntas frecuentes</h2>
      <div class="faq">${art.faq.map((f) => `<details><summary>${esc(f.pregunta)}</summary><p>${rich(f.respuesta)}</p></details>`).join('')}</div>
    </section>`
        : ''
    }

    ${
      rel.length
        ? `<section id="relacionados">
      <h2>Artículos relacionados</h2>
      <div class="lista-grid">${rel.map((a) => `<a class="art-card" href="${base}/a/${a.slug}"><h3>${esc(a.titulo)}</h3><p>${esc(a.resumen)}</p></a>`).join('')}</div>
    </section>`
        : ''
    }

    <section class="util">
      <p>¿Te sirvió este artículo?</p>
      <div class="util-btns">
        <button type="button" data-util="si">Sí</button>
        <button type="button" data-util="no">No</button>
      </div>
      <p class="util-ok" hidden>Gracias por tu respuesta.</p>
    </section>
  </article>

  <aside class="art-aside">
    <div class="aside-caja">
      <p class="aside-tit">En este artículo</p>
      <nav class="toc">
        <a href="#para-que-sirve">Para qué sirve</a>
        ${art.requisitos?.length ? '<a href="#antes-de-empezar">Antes de empezar</a>' : ''}
        <a href="#paso-a-paso">Paso a paso</a>
        <ol class="toc-pasos">${art.pasos.map((p) => `<li><a href="#paso-${p.n}">${esc(p.titulo)}</a></li>`).join('')}</ol>
        ${art.tips?.length ? '<a href="#recomendaciones">Recomendaciones</a>' : ''}
        ${art.faq?.length ? '<a href="#preguntas">Preguntas frecuentes</a>' : ''}
      </nav>
    </div>
  </aside>
</div>`;

  const jsonld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: art.titulo,
    description: art.resumen,
    inLanguage: 'es-CL',
    totalTime: undefined,
    step: art.pasos.map((p) => ({ '@type': 'HowToStep', position: p.n, name: p.titulo, text: p.cuerpo })),
  });

  return layout({
    titulo: art.titulo,
    descripcion: art.resumen,
    contenido,
    base,
    cat,
    canonical: `/a/${art.slug}`,
    clase: 'p-articulo',
    jsonld,
  });
}

// ---------------------------------------------------------------- estado
function paginaEstado({ categorias, articulos }) {
  const base = '';
  const fila = (a) => {
    const c = categorias.find((x) => x.id === a.categoria);
    const cc = capturasDe(a), tp = totalPasos(a);
    return `<tr>
      <td><a href="/a/${a.slug}">${esc(a.titulo)}</a></td>
      <td><span class="chip" style="--acento:${c.color};--acento-rgb:${c.colorRgb}">${esc(c.producto)}</span></td>
      <td>${esc(a.seccion)}</td>
      <td class="num">${cc}/${tp}</td>
      <td><span class="mini-barra"><span style="width:${Math.round((cc / Math.max(1, tp)) * 100)}%;background:${c.color}"></span></span></td>
      <td><span class="estado-${a.estado}">${esc(a.estado)}</span></td>
    </tr>${
      cc < tp
        ? `<tr class="fila-pendientes"><td colspan="6"><details><summary>${tp - cc} paso${
            tp - cc === 1 ? '' : 's'
          } sin captura</summary><ul>${a.pasos
            .filter((p) => !p.captura)
            .map((p) => `<li>${p.n}. ${esc(p.titulo)}</li>`)
            .join('')}</ol></details></td></tr>`
        : ''
    }`;
  };
  const totalPasosT = articulos.reduce((s, a) => s + totalPasos(a), 0);
  const totalCap = articulos.reduce((s, a) => s + capturasDe(a), 0);

  const contenido = `
<div class="wrap seccion">
  <nav class="migas"><a href="/">Centro de Ayuda</a> <span>/</span> Estado del contenido</nav>
  <h1>Estado del contenido</h1>
  <p class="sub-seccion">Avance de la documentación y de las capturas tomadas desde el ERP. Esta página es interna del equipo.</p>
  <div class="kpis">
    <div class="kpi"><b>${articulos.length}</b><span>artículos</span></div>
    <div class="kpi"><b>${categorias.length}</b><span>categorías</span></div>
    <div class="kpi"><b>${totalPasosT}</b><span>pasos documentados</span></div>
    <div class="kpi"><b>${totalCap}</b><span>pasos con captura</span></div>
    <div class="kpi"><b>${Math.round((totalCap / Math.max(1, totalPasosT)) * 100)}%</b><span>avance de capturas</span></div>
  </div>
  <div class="tabla-wrap">
    <table class="tabla">
      <thead><tr><th>Artículo</th><th>Módulo</th><th>Sección</th><th class="num">Capturas</th><th>Avance</th><th>Estado</th></tr></thead>
      <tbody>${categorias.map((c) => articulos.filter((a) => a.categoria === c.id).map(fila).join('')).join('')}</tbody>
    </table>
  </div>
</div>`;

  return layout({ titulo: 'Estado del contenido', descripcion: 'Avance de artículos y capturas del centro de ayuda.', contenido, base, canonical: '/estado', clase: 'p-estado' });
}

// ---------------------------------------------------------------- 404
function pagina404() {
  const contenido = `
<div class="wrap seccion">
  <h1>404 — Página no encontrada</h1>
  <p class="sub-seccion">No encontramos lo que buscabas. Puede que el artículo haya cambiado de nombre.</p>
  <p><a href="/">Volver al Centro de Ayuda</a></p>
</div>`;
  return layout({
    titulo: 'Página no encontrada',
    descripcion: 'La página que buscas no existe.',
    contenido,
    canonical: '/404',
    clase: 'p-404',
  });
}

// ---------------------------------------------------------------- índice de búsqueda
function indiceBusqueda({ categorias, articulos }) {
  return articulos.map((a) => {
    const c = categorias.find((x) => x.id === a.categoria);
    return {
      t: a.titulo,
      u: `/a/${a.slug}`,
      c: c.producto,
      cn: c.nombre,
      col: c.color,
      s: a.resumen,
      k: [a.seccion, a.proposito, ...a.pasos.map((p) => p.titulo), ...(a.faq || []).map((f) => f.pregunta)].join(' ').toLowerCase(),
    };
  });
}

// ---------------------------------------------------------------- escritura
function escribir(rel, contenido) {
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, contenido);
}

function main() {
  const data = cargar();
  const { categorias, articulos } = data;

  fs.mkdirSync(OUT, { recursive: true });
  escribir('index.html', portada(data));
  escribir('estado.html', paginaEstado(data));
  for (const cat of categorias) escribir(`c/${cat.id}.html`, paginaCategoria(cat, articulos));
  for (const art of articulos) {
    const cat = categorias.find((c) => c.id === art.categoria);
    escribir(`a/${art.slug}.html`, paginaArticulo(art, cat, articulos));
  }
  // Purgar páginas de artículos o categorías que ya no existen en content/
  const purgar = (dir, vigentes) => {
    const d = path.join(OUT, dir);
    if (!fs.existsSync(d)) return 0;
    let n = 0;
    for (const f of fs.readdirSync(d).filter((f) => f.endsWith('.html'))) {
      if (!vigentes.has(f.replace('.html', ''))) {
        fs.unlinkSync(path.join(d, f));
        console.log(`  − eliminada página huérfana: ${dir}/${f}`);
        n++;
      }
    }
    return n;
  };
  purgar('a', new Set(articulos.map((a) => a.slug)));
  purgar('c', new Set(categorias.map((c) => c.id)));

  escribir('buscar.json', JSON.stringify(indiceBusqueda(data)));
  escribir('sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      [`${SITIO.url}/`, ...categorias.map((c) => `${SITIO.url}/c/${c.id}`), ...articulos.map((a) => `${SITIO.url}/a/${a.slug}`)]
        .map((u) => `  <url><loc>${u}</loc></url>`)
        .join('\n') +
      `\n</urlset>\n`);
  escribir('robots.txt', `User-agent: *\nAllow: /\nDisallow: /estado\nSitemap: ${SITIO.url}/sitemap.xml\n`);

  // GitHub Pages: dominio propio + desactivar el procesado Jekyll (ignora _entrada/, etc.)
  escribir('CNAME', `${SITIO.url.replace(/^https?:\/\//, '')}\n`);
  escribir('.nojekyll', '');
  escribir('404.html', pagina404());

  // assets fuente (assets/) -> public/assets/, sin tocar las capturas ya subidas
  const src = path.join(ROOT, 'assets');
  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const p = path.join(src, f);
    if (fs.statSync(p).isFile()) fs.copyFileSync(p, path.join(OUT, 'assets', f));
  }
  // carpetas de capturas por módulo (para el flujo con el plugin de Chrome)
  for (const cat of categorias) fs.mkdirSync(path.join(OUT, 'assets', 'capturas', cat.id), { recursive: true });

  const capturas = articulos.reduce((s, a) => s + capturasDe(a), 0);
  const pasos = articulos.reduce((s, a) => s + totalPasos(a), 0);
  console.log(`✓ ${articulos.length} artículos · ${categorias.length} categorías · ${capturas}/${pasos} pasos con captura`);
  console.log(`  → ${OUT}`);
}

main();
