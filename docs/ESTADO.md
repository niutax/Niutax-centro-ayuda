# Estado del proyecto — retomar sin contexto previo

Este archivo existe para que una sesión nueva pueda continuar el trabajo sin depender
de la conversación anterior. Léelo primero, junto con el mapa del módulo que toque.

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Contenido (fuente de la verdad) | `content/articulos/<modulo>/<slug>.json` |
| Capturas publicadas | `public/assets/capturas/<modulo>/` |
| Buzón de capturas (temporal) | `public/assets/capturas/_entrada/` |
| Generador del sitio | `build.js` → `public/` |
| Preview | `node serve.js` · http://localhost:4322 |
| Avance y pendientes por artículo | http://localhost:4322/estado — solo en el preview local; se genera en `docs/estado.html`, fuera de `public/`, y no se publica |
| Mapas de menús de cada ERP | `docs/mapa-*.md` |
| Protocolo de captura y privacidad | `CAPTURAS.md` + este archivo |

## Avance por módulo (07-09-2026)

| Módulo | Pantallas del ERP | Artículos | Sin ninguna imagen | Pasos con captura | Estado |
|---|---|---|---|---|---|
| Niupos — Gestión Comercial | 32 | 34 | 0 | 58 | Revisado contra el sistema |
| Niudata — Contabilidad y Finanzas | 66 | 49 | 0 | 50 | Revisado contra el sistema |
| NiuHR — Gestión de RRHH | 28 | 21 | 0 | 25 | Revisado contra el sistema |
| Niutax — Gestión Tributaria | 56 | 25 | 0 | 27 | Relevado; 16 revisados, 9 en borrador |

Total: 129 artículos · 164 de 489 pasos con captura · **ningún artículo sin imagen**.
El detalle de qué pasos siguen sin imagen está en `/estado`, artículo por artículo.

## Adquisición (09-09-2026)

Aplicado el documento "Convertir docs.niutax.cl en pieza de adquisición":
- **Dominio canónico**: `https://docs.niutax.cl` (`SITIO.url` en `build.js`; antes `ayuda.niutax.cl`).
- **CTA de prueba gratis** en el pie de todos los artículos (componente `ctaPrueba()` en `build.js`,
  `utm_campaign=cta_articulo`) y botón **Prueba gratis** en el header (`cta_header`).
- **Categorías renombradas, slugs intactos**: Contabilidad y Finanzas (Módulo Niudata) ·
  Remuneraciones y Personas (Módulo NiuHR) · Ventas y Facturación (Módulo Niupos) ·
  Impuestos y Cumplimiento SII (Módulo Niutax). El campo `subtitulo` alimenta chips y cabeceras.
- **Categoría nueva "Antes de empezar"** (`/c/antes-de-empezar`, `esModulo: false`, primera en el orden),
  8 artículos en formato pregunta/respuesta con `esquema: "FAQPage"` y `estado: publicado`;
  enlazada en la portada sobre la grilla de módulos.
- **Metadatos**: `og:url`, `og:image` (primera captura o el logo), `article:published_time` /
  `modified_time`, JSON-LD `HowTo` (procedimientos), `Article` (conceptos) o `FAQPage`.
- **Render de bloques** en pasos y propósito: párrafos, listas y tablas en Markdown mínimo (`bloques()`).
- **`[VERIFICAR: …]`** en el JSON se publica como comentario HTML (invisible al lector).
- "Niudata" como marca: cambiado en 3 textos (título de `que-es-niudata`, resumen de
  `integraciones-niudata`, una FAQ de `emitir-factura-electronica`). Se conservan las 2 menciones
  que son valores literales de pantalla del ERP (columna "S.Contable: Niudata/Externo").

**Pendientes `[VERIFICAR]`** (5): ruta del menú para invitar al contador · sistemas y formatos
que acepta el migrador (×2 artículos) · qué informes se exportan y en qué formatos (el paso
"Qué puedes exportar" de `que-pasa-con-mis-datos-si-me-voy` NO debe publicarse sin esa
confirmación) · si existe modalidad para holdings sobre el plan Full.

**Hallazgo**: el slug `acuses-de-recibo` existe en `niudata` y en `niutax`; `build.js` escribe
una sola página `/a/acuses-de-recibo` y la de Niudata queda pisada. Decidir cuál renombrar.

## Accesos usados

| ERP | URL | Empresa |
|---|---|---|
| **Central (login único, desde 09-2026)** | `central.niu.tax` → tarjetas por módulo → Entrar abre el módulo en pestaña nueva vía `/auth/central/redirect` | ya no existen logins directos por módulo |
| Niupos | `pos.niudata.cl` | la que el usuario deje activa |
| Niudata | `fin.niu.tax/<slug-empresa>` | slug de la empresa de pruebas (ver `docs/ACCESOS.local.md`) |
| NiuHR | `hr.niu.tax` | la misma, ya cargada |
| Niudata (2ª pasada, 07-09-2026) | `fin.niu.tax/<slug>` | slug y razón social en `docs/ACCESOS.local.md`; se fuerza a ACME DEMO SPA con `window.__PRIVADOS` |
| Niupos (URL nueva) | `pos.niu.tax` (antes `pos.niudata.cl`) | — |
| Niutax | `niu.tax` (**no** `app.niutax.cl`, da error 525) | multi-empresa: se ve la cartera completa |

El login lo hace **el usuario** en su Chrome: no se ingresan credenciales.
Si aparece la pantalla de login, hay que pedírselo y esperar.

## Protocolo de privacidad acordado

**Anonimizar siempre**
- Nombre de la empresa titular → `ACME DEMO SPA` (y el resto de empresas del selector,
  a nombres ficticios en inglés)
- Nombre del usuario y de cualquier persona natural → `John Doe`, `Jane Smith`,
  `Mark Brown`, `Emily Clark`… (mapeo consistente: el mismo original siempre al mismo alias)
- Titular del certificado digital → `JOHN A. DOE`
- RUT de la empresa titular → `11.111.111-1`
- Emails → `contact@example.com` · Celulares → `+56 9 1234 5678`
- Números de cuenta bancaria → `••••1234` (últimos 4 dígitos)
- Direcciones → `MAIN STREET 100, Suite 12`

**Autorizado a mostrar sin anonimizar** (decisión explícita del usuario, acelera el trabajo)
- En Niudata: libros de compras, ventas y honorarios, y cuentas por cobrar y por pagar,
  con sus RUT, razones sociales y montos reales.

**Nunca capturar**: claves del SII, contraseñas de certificados, valores de API tokens.

**En Niutax, además** (es multi-empresa: los datos son la cartera de clientes, no una empresa)
- Se anonimizan **todos** los RUT, no solo el del titular, y cada uno recibe un RUT ficticio
  distinto con dígito verificador válido: colapsarlos a uno solo destruye la pantalla.
- Usar `window.T()` (no `A()`): ver `docs/anon.js`.
- **No abrir el combo "Filtrar ruts"** en una captura: sus opciones son nombres de grupo que
  corresponden a personas reales y no siguen el formato "RUT - razón social" que el
  anonimizador sabe reescribir.

**Método**: se inyecta el anonimizador en la pantalla ANTES del screenshot; solo reescribe
texto visible, no toca datos del sistema. Ver `docs/anon.js`. Guardarlo en
`sessionStorage` permite reusarlo en toda la sesión del navegador:

```js
sessionStorage.setItem('A','window.A='+A.toString());   // una vez por dominio
eval(sessionStorage.A); A();                            // en cada pantalla
```

**Reglas por módulo** (todas en `docs/anon.js`, cada una con la fuga que la originó)
- NiuHR → `A(); P(); H();` — H() alinea el thead por la derecha (columna de avatar sin th),
  aliasa NOMBRE solo si la tabla tiene RUT/EMAIL, trata ROL ("Operador de <nombre real>"),
  reemplaza avatares por la silueta y enmascara IPs. P() solo dentro de la campana de
  notificaciones: aplicado a toda la página convierte los cargos en personas.
- Niutax → `T(); G(); U();` — G() para listas "RUT - nombre" en celdas (Grupos); U() para
  personas naturales en MAYÚSCULAS dentro de celdas (3+ palabras, sin dígitos, lista negra de
  estados como "TG EN PROCESO").
- Niudata (Filament) → `eval(N); A(); M();` — `window.__N` lleva la razón social de la empresa
  activa; M() v2 enmascara corridas de 6-12 dígitos sin puntos (cuentas bancarias pegadas al
  nombre del banco). La app blurea por sí misma RUT, nombre y usuario en varias tablas, pero el
  DOM conserva el dato: anonimizar igual.
- Tokens de API (Integraciones): enmascarar cadenas de 24+ caracteres antes de capturar.

**Regla de oro**: si una captura sale con un dato real, se descarta y se rehace.
Nunca se sube "para arreglarla después".

## Cómo llegan las capturas al disco

El plugin de Chrome no guarda archivos accesibles. La vía que funciona:

1. `node serve.js` levanta el buzón en `http://localhost:4322/subir.html`
2. Se abre esa página en una pestaña del Chrome del usuario
3. `upload_image` sube el screenshot (por `imageId`) al `<input type=file>`
4. El endpoint `POST /_captura` de `serve.js` lo guarda en `_entrada/`

**Los screenshots expiran**: hay que subir cada uno inmediatamente después de tomarlo,
nunca en lote al final.

5. **Recorte obligatorio antes de compilar**: el visor captura a 1568 px pero la app termina
   cerca de 1250, y `build.js` declara width/height leyendo el archivo. Correr
   `node docs/recortar.js public/assets/capturas/_entrada/*.png` y recién después mover a la
   carpeta del módulo y compilar. Lección: `sips -c … --cropOffset 0 0` recorta desde el
   centro, no desde la esquina; el recorte se hace en Node sobre píxeles y `sips` solo
   convierte de formato. Los archivos subidos son JPEG aunque se llamen .png.

## Acciones que NO se ejecutan en los ERP

Se documentan por su función declarada, pero no se ejecutan:
emitir documentos tributarios, solicitar folios al SII, alterar la correlación de folios,
crear datos maestros sin autorización, dar acuse de recibo, ceder documentos.

## Bugs y límites encontrados en los ERP (reportados al usuario)

- Niupos `/configuracion/productos-y-servicios` → **error 500** en algunas empresas
- Niupos `/informes/cosechas` → **error 500**
- Niupos `/configuracion/folios/detalle-folios/{id}` → "Próximamente", en desarrollo
- Niutax `/impuestos-mensuales/f50` → **"Menú en desarrollo — Próximamente"** (07-09-2026)
- Niudata: el botón **Generar informe** de estados financieros e informes de gestión no responde
  al clic automatizado (ni JS ni clic real por coordenadas); esos artículos llevan la pantalla
  de filtros. El dashboard carga sus widgets de forma diferida: scroll y ~15 s de espera antes
  de anonimizar y capturar.
- Niutax: el combo **"Filtrar ruts"** lista grupos cuyos nombres son personas reales y no
  siguen el formato "RUT - razón social": nunca abrirlo en una captura.

## Qué falta

1. **Capturas pendientes**: 324 pasos sin imagen, listados uno por uno en `/estado`. Ya no
   hay ningún artículo sin imagen; lo que falta son los pasos 2..n de cada uno.
2. **Niutax en borrador (9)**: bienes-de-los-contribuyentes, cpt-municipal, f22-y-antecedentes,
   f50-y-retenciones, isfut-retiros-y-libros-anuales, mantenedores-del-sistema,
   observaciones-de-renta, paneles-de-renta, planes-cupones-y-facturacion — tienen captura de
   su pantalla principal, pero no se abrieron todas las pantallas que describen.
3. **Informes generados en Niudata**: balance clasificado, 10 columnas, comprobación, estado de
   resultados, libro mayor, flujo de caja e informe por auxiliar solo tienen la pantalla de
   filtros; falta la captura del informe ya generado (requiere clic manual en Generar).
