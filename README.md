# Centro de Ayuda · Niutax ERP

Sitio estático de ayuda para los usuarios de Niutax ERP. Contenido en JSON, generación
sin dependencias externas (solo Node), preview local con servidor propio.

## Categorías

| ID | Categoría | Producto | Acento |
|----|-----------|----------|--------|
| `niudata` | Contabilidad y Finanzas | Niudata | teal `#0d9488` |
| `niuhr` | Gestión de RRHH | NiuHR | lima `#65a30d` |
| `niupos` | Gestión Comercial | NiuPOS | azul `#0284c7` |
| `niutax` | Gestión Tributaria | Niutax | verde marca `#16a34a` |

## Estructura

```
content/
  categorias.json                  # las 4 categorías, su color, icono y secciones
  articulos/<categoria>/<slug>.json  # un archivo por artículo (fuente de la verdad)
assets/                            # fuentes de estilos, JS e íconos
  styles.css  app.js  favicon.svg
public/                            # GENERADO por build.js — no editar a mano, no está en git
  index.html  estado.html  buscar.json  sitemap.xml  robots.txt  CNAME  404.html
  c/<categoria>.html               # página de categoría   → URL /c/niudata
  a/<slug>.html                    # página de artículo    → URL /a/emitir-factura-electronica
  assets/capturas/<categoria>/     # imágenes capturadas del ERP
build.js                           # generador estático
capturar.js                        # incorpora capturas y textos a los artículos
serve.js                           # servidor de preview (puerto 4322)
CAPTURAS.md                        # flujo de trabajo con el plugin de Chrome
.github/workflows/deploy.yml       # build + publicación en GitHub Pages
```

## Comandos

Generar el sitio:

```bash
node build.js
```

Levantar el preview en http://localhost:4322 (también disponible como configuración
`ayuda-niutax` en `.claude/launch.json`):

```bash
node serve.js
```

> En este equipo Node está en `~/.local/node/bin/node` (ver memoria del proyecto).

## Logotipo del encabezado

El logotipo lleva el texto quemado en la imagen, así que hacen falta **dos archivos**: uno
con texto negro para la vista clara y otro con texto blanco para la oscura. Se dejan en
`assets/` con estos nombres base (vale `.svg`, `.png` o `.webp`):

| Archivo | Vista |
|---|---|
| `assets/logo-claro.*` | clara — texto negro |
| `assets/logo-oscuro.*` | oscura — texto blanco |

El intercambio lo hace el CSS (`.marca-logo.solo-claro` / `.solo-oscuro`), no JavaScript,
para que el logo correcto esté pintado en el primer frame y no parpadee al cargar. `build.js`
lee la proporción real del archivo y declara `width`/`height` en el `<img>`, de modo que el
logo no provoque salto de layout.

**Si los archivos no están, el encabezado cae al escudo SVG + texto** que trae el sitio: no
se rompe, solo no muestra el logotipo de marca. Si prefieres SVG, es lo recomendable, porque
el encabezado lo pinta a 28 px de alto y escala sin perder nitidez en pantallas retina.

## Editor de artículos

Con `node serve.js` corriendo, **http://localhost:4322/admin** abre el editor: crear y editar
artículos, ordenar pasos, asociar capturas desde el buzón (se recortan solas), enviar a la
papelera y compilar. El botón **Pedir a Claude** redacta o mejora un artículo mirando sus
capturas; necesita `ANTHROPIC_API_KEY` en `admin/.env` (ver `admin/.env.ejemplo`). La
misma API JSON la usan Claude Code y el plugin de Chrome para cargar tutoriales: está
documentada en [docs/API-ADMIN.md](docs/API-ADMIN.md). Única dependencia: `npm install`
instala `@anthropic-ai/sdk`.

## Esquema de un artículo

```jsonc
{
  "slug": "emitir-factura-electronica",
  "titulo": "Emitir una factura electrónica",
  "categoria": "niupos",
  "seccion": "Emisión de documentos",     // debe existir en categorias.json
  "tipo": "procedimiento",                 // procedimiento | concepto
  "resumen": "…",                          // 1 línea, se usa en listados y búsqueda
  "tiempoLectura": "4 min",
  "estado": "borrador",                    // borrador → revisado → publicado
  "orden": 3,
  "actualizado": "2026-08-16",
  "publicoObjetivo": ["Vendedor"],
  "proposito": "Para qué sirve…",          // bloque destacado del artículo
  "requisitos": ["…"],
  "pasos": [
    {
      "n": 1,
      "titulo": "Crear el documento",
      "cuerpo": "…",
      "nota": null,
      "captura": {                         // null mientras no haya imagen
        "archivo": "emitir-factura-electronica-01.png",
        "alt": "…",
        "descripcion": "…"
      }
    }
  ],
  "tips": ["…"],
  "faq": [{ "pregunta": "…", "respuesta": "…" }],
  "relacionados": ["slug-1", "slug-2"],
  "fuente": { "url": "https://app.niutax.cl/…", "capturadoEl": "2026-08-16" }
}
```

En `cuerpo`, `proposito`, `nota`, `tips` y respuestas de FAQ se admite formato mínimo:
`` `código` ``, `**negrita**` y `[texto](url)`.

## Despliegue en GitHub Pages

El repo es [niutax/Niutax-centro-ayuda](https://github.com/niutax/Niutax-centro-ayuda). El sitio se
publica con GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)): cada push
a `main` corre `node build.js` y sube `public/` como artefacto de Pages — no hace falta commitear el
sitio generado, solo `content/` y `assets/` (las fuentes). `public/` está en `.gitignore`.

`build.js` genera además lo que Pages necesita:

- `public/CNAME` con el dominio (`ayuda.niutax.cl`, tomado de `SITIO.url`).
- `public/.nojekyll` para que Pages no procese el sitio con Jekyll (de lo contrario ignora
  archivos/carpetas que empiezan con `_`, como `assets/capturas/_entrada/`).
- `public/404.html` para la página de error.

Las URLs limpias (`/a/<slug>`, `/c/<categoria>`, sin `.html`) funcionan tal cual porque Pages resuelve
`/a/slug` sirviendo `a/slug.html` si existe, igual que hace `serve.js` en local.

Configuración una sola vez en GitHub: **Settings → Pages → Source: GitHub Actions**, y en el DNS del
dominio apuntar `ayuda.niutax.cl` (CNAME) al hostname de Pages del repo.

## Retomar el trabajo

Si vuelves a este proyecto sin el contexto de la conversación anterior, lee primero
[docs/ESTADO.md](docs/ESTADO.md): avance por módulo, accesos, protocolo de privacidad,
cómo llegan las capturas al disco y qué falta. Los mapas de menús de cada ERP están
en `docs/mapa-niupos.md`, `docs/mapa-niudata.md`, `docs/mapa-niuhr.md` y `docs/mapa-niutax.md`.

## Estado del contenido

`/estado` (no indexable) muestra el avance: artículos, pasos documentados y cuántos
pasos ya tienen captura del ERP. Es la pantalla de control del trabajo de captura.

Cada artículo tiene un `estado`: **borrador** (la pantalla existe en el menú real pero no
se abrió; el texto describe su función declarada) o **revisado** (verificado pantalla por
pantalla contra el ERP real). Los cuatro módulos están relevados y **ningún artículo queda sin imagen** (164 de 489 pasos
con captura al 07-09-2026). El detalle de qué pasos faltan por capturar está en `/estado`,
artículo por artículo. Antes de compilar, las capturas nuevas se recortan con
`node docs/recortar.js public/assets/capturas/_entrada/*.png`.
