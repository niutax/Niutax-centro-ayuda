# Relevamiento Niupos — estructura real por pantalla

Capturas en `public/assets/capturas/_entrada/` (anonimizadas: ACME DEMO SPA, John Doe,
RUT 11.111.111-1, contact@example.com).

## Concepto transversal
- Selector **mes/año** + botón **Mes abierto / Click para cerrar** en Emisión y Boletas.
  Cerrar el mes bloquea la emisión en ese período.
- Ícono de grilla en el header = switcher del ecosistema: Contabilidad y Finanzas,
  Gestión tributaria, Gestión RRHH.
- Cada pantalla tiene botón **Tutorial** (video) arriba a la derecha.

## Configuración

### Empresas ✅ ARTÍCULO LISTO
### Folios ✅ ARTÍCULO LISTO
### Certificados — `certificados-01/02.jpg`
Tabla: RUT · FECHA INGRESO · FECHA VENCIMIENTO · NOMBRE · ARCHIVO · ESTADO (ACTIVO) · TIPO (REP. LEGAL).
Acciones: descargar, editar, eliminar. Botón **Agregar**.
Modal *Nuevo certificado digital*: Certificado (.pfx) · Contraseña del certificado ·
toggle **Certificado del representante legal**.

### Productos y servicios — `productos-01/02.jpg`, categorías `productos-03.jpg`
⚠️ Da **error 500** en algunas empresas (pasó con la empresa de certificación).
Botones: **Categorías**, **Exportar a Excel** (descargar catálogo), **Listas de precios**
(reutilizables), **Agregar**.
Columnas: CUENTAS (badges A/C) · TIPO · CATEGORÍA · CÓDIGO · CÓDIGO COMPRA · DESCRIPCIÓN ·
MEDIDA · P.COMPRA · P.VENTA · IVA · IMPUESTO.
Acciones fila: **Precios personalizados por cliente**, Editar, Eliminar.
Modal alta: Tipo (Producto/Servicio) · Descripción · Para (Compra/Venta) · Código compra ·
Código venta · Unidad de medida (Unidad, Kilo, Litro, Centímetro, Caja, Bin, Rollo, Metro) ·
Peso · Inventariable (Sí/No) · Mano de obra externa (No/Trabajador externo/Contratista) ·
Precio de compra + Divisa (CLP/EUR/USD/UF) · Precio de venta + Divisa · Afecto a IVA ·
Categoría · Impuesto adicional · **Cuenta de activo** · **Cuenta de costo** · **Cuenta de venta**.
Categorías: jerarquía de 2 niveles (ej. FT - Fitosanitario → FT01 Act. Biológico…).

### Ubicaciones — `ubicaciones-01/02.jpg`
Tabla: TIPO · CÓDIGO · NOMBRE · CENTRO DE COSTO · SUPERFICIE. Editar/Eliminar. Agregar.
Modal: Tipo (**Bodega, Sector, Destino, Sucursal, Casa matriz, Vehículo**) · Código ·
Nombre · Superficie m² · Centro de costos.

### Personal — `personal-01/02.jpg`
Tabla: RUT · TIPO · NOMBRE · ESTADO. Modal *Registrar personal*:
Tipo (**Trabajador, Trabajador externo, Contratista**) · Rut · Nombre · Estado (Activo/Inactivo).

### Centros de costo — `centros-costo-01.jpg`
Solo lectura, sin botón agregar (llegan desde contabilidad).

### Importar Datos — `importar-01.jpg`
4 tarjetas: **Productos y servicios** (con categorías y precios de compra y venta) ·
**Boletas** · **Facturas** · **Documentos XML** (XML o ZIP).

## Doc. electrónicos

### Emisión de documento ✅ ARTÍCULO LISTO
### Boletas Emitidas — `boletas-01.jpg`
Totales del mes (documentos, neto, exento, IVA, general) + selector de mes +
**Mes abierto**. Botones: **Exportar a Excel**, **Importar boletas**.
Columnas: FOLIO · FECHA · TIPO DOCUMENTO · RUT · NOMBRE · TIPO · TOTAL · ESTADO.

### Punto de venta — `pos-01.jpg`
Pantalla de caja. Izquierda: **Agregar producto** (buscar por nombre o código),
tabla CÓDIGO/PRODUCTO/CANTIDAD/PRECIO/SUBTOTAL, totales Exento/Neto/IVA/Total,
**Pagos ingresados** (FORMA DE PAGO / TOTAL).
Derecha: Tipo de documento (Boleta Electrónica) · Fecha · Vendedor · **Asignar cliente**
(por RUT, opcional) · TOTAL DE LA VENTA. Botones: **Nueva venta**, Agregar, **Emitir documento**.

### Cotizaciones — pendiente recapturar
Filtro **Estado** (Todos). Columnas: N° · FECHA · CLIENTE · RUT · VENDEDOR · TOTAL · ESTADO.
Botón **Nueva cotización**.

## Pendientes de capturar
Doc. electrónicos: orden-de-compra, orden-de-trabajo, traspasos, acuse-de-recibo,
guia-de-entrada, facturas-recurrentes, documentos-recibidos, cesiones.
Administración: vendedores, roles, usuarios, planes, rechazos-sii.
Informes: inventario, guias, consumo, producto, cosechas, ventas-detalladas, movimientos-pmp.
