# Flujo de captura desde el ERP

La base del centro de ayuda ya está: 4 categorías, 43 artículos y 209 pasos redactados.
Lo que falta es **validar cada paso contra la interfaz real y agregar las capturas**.

## Cómo funciona

Con el plugin de Chrome (Claude en Chrome) puedo navegar el ERP contigo, leer el texto
de cada pantalla y tomar capturas. Cada sesión de captura sigue este ciclo:

1. **Elegir el artículo.** Uno a la vez, empezando por el más consultado del módulo.
   `/estado` muestra qué falta.
2. **Recorrer el proceso en el ERP.** Navego la ruta real (menú → pantalla → acción) y
   comparo contra los pasos ya redactados: corrijo nombres de botones, orden de pasos y
   cualquier cosa que no calce con la interfaz.
3. **Capturar la pantalla de cada paso.** Una imagen por paso, del área relevante.
4. **Incorporar.** Se aplican imagen y texto corregido al JSON del artículo.
5. **Regenerar y revisar.** `node build.js` y verificamos el artículo en el preview.
6. **Marcar el estado.** `revisado` cuando el contenido calza con el ERP, `publicado`
   cuando queda aprobado para clientes.

## Aplicar una captura

Individual:

```bash
node capturar.js emitir-factura-electronica 1 ~/Desktop/captura.png \
  --alt "Formulario de nueva factura" \
  --desc "Comercial → Documentos → Nueva factura"
```

Por lote (una sesión completa de un artículo):

```bash
node capturar.js --lote lote.json
```

```jsonc
{
  "articulo": "emitir-factura-electronica",
  "fuente": "https://app.niutax.cl/comercial/documentos/nuevo",
  "estado": "revisado",
  "pasos": [
    {
      "n": 1,
      "imagen": "/ruta/captura-1.png",
      "alt": "Formulario de nueva factura",
      "desc": "Comercial → Documentos → Nueva factura",
      "texto": "Texto corregido del paso, si cambió respecto del borrador",
      "titulo": "Título corregido del paso (opcional)"
    }
  ]
}
```

El comando copia la imagen a `public/assets/capturas/<categoria>/<slug>-NN.ext`,
actualiza el JSON del artículo, registra la URL de origen y la fecha, y sube la fecha
de `actualizado`. Después hay que correr `node build.js`.

## Criterios para las capturas

- **Una captura por paso**, del área donde ocurre la acción; no la pantalla completa si
  el detalle relevante es un panel.
- **Ancho consistente**: capturar siempre con el navegador en el mismo ancho (1440 px
  recomendado) para que el artículo se vea parejo.
- **Datos de demo, no reales.** Antes de capturar, usar una empresa de prueba o
  enmascarar RUT, razón social, montos y nombres de trabajadores. Las capturas de
  remuneraciones y de contabilidad son las más sensibles.
- **Nombres de personas → nombre ficticio en inglés** (`JOHN A. DOE`). Aplica al
  titular del certificado digital, vendedores, trabajadores y contactos. Se hace
  reemplazando el texto en el navegador antes de capturar; no altera ningún dato
  del ERP, solo lo que se ve en pantalla.
- **Listados de terceros → filtrar antes de capturar.** El buscador de la pantalla
  es la herramienta: filtrar por una empresa propia (NIUCODE, NIUDATA, NIUTAX)
  deja una captura publicable sin exponer la cartera de clientes. Ya aplicado en
  *Auxiliares registrados* y en *Configuración → Empresas* (59 empresas reales).
- **Nunca capturar valores de credenciales**: claves del SII, contraseñas de
  certificados ni el valor de un API token.
- **Texto alternativo siempre** (`alt`): es lo que lee el buscador y quien usa lector de
  pantalla.
- **Sin marcas de cursor ni tooltips accidentales.**

## Orden sugerido

Primero los artículos de mayor tráfico esperado, que además son los que definen el
estándar visual del resto:

1. `emitir-factura-electronica` (NiuPOS)
2. `declarar-formulario-29` (Niutax)
3. `procesar-liquidaciones-de-sueldo` (NiuHR)
4. `conciliacion-bancaria` (Niudata)
5. Los cuatro `que-es-*` de cada módulo (son la puerta de entrada del centro de ayuda)

Después, el resto de cada módulo por secciones.

## Nota sobre el contenido actual

Los pasos redactados provienen de la documentación pública de producto (niutax.cl) y del
conocimiento del dominio contable/tributario chileno, **no de la interfaz real del ERP**.
Sirven como esqueleto y como guion de la sesión de captura, pero cada uno debe
confirmarse en pantalla antes de pasar a `revisado`.
