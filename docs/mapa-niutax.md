# Mapa real de Niutax (niu.tax) — 56 pantallas en 6 menús

URL del módulo: **`https://niu.tax`** (no `app.niutax.cl`, que devuelve error 525 de Cloudflare).
Login por SSO compartido con los otros módulos: si hay sesión en Niudata, `niu.tax` entra directo.

A diferencia de los otros tres módulos, Niutax es **multi-empresa por diseño**: el usuario
administrador ve la cartera completa de RUT y opera sobre ella. Los paneles muestran cientos
de empresas a la vez, con RUT y razón social reales → toda captura exige anonimización.

## Administración (13)
- /administracion/usuarios · /roles · /ruts (Mis ruts) · /propiedades (Mis propiedades)
- /administracion/vehiculos (Mis vehículos) · /malla-societaria · /grupos
- /administracion/direcciones (Mis direcciones) · /planes · /cupones
- /administracion/valor-actividades · /control-horas · /correos-enviados

## Mantenedores (8)
- /mantenedores/tipos-de-empresa · /tamanos-de-empresa · /regimen-tributario
- /mantenedores/correccion-monetaria · /factores-de-renta · /calendario-tributario
- /mantenedores/maestro-de-socios · /convenios

## Impuestos mensuales (12)
- /impuestos-mensuales/panel-de-control · /f29 · /f50 · /retenciones · /contribuciones
- /impuestos-mensuales/libro-de-caja · /libro-de-compras · /libro-de-ventas
- /impuestos-mensuales/libro-de-honorarios · /libro-de-remuneraciones
- /impuestos-mensuales/acuses-de-recibo · /deudas-vigentes

## Declaraciones de renta (13)
- /declaraciones-de-renta/panel-de-control (Panel empresas DJ)
- /declaraciones-de-renta/panel-de-empresas (Panel empresas F22)
- /declaraciones-de-renta/panel-de-personas · /resumen-anual · /f22
- /declaraciones-de-renta/informacion-de-terceros · /declaraciones-juradas
- /declaraciones-de-renta/certificados-de-renta · /isfut · /retiros-y-dividendos
- /declaraciones-de-renta/balance-8-columnas · /libro-de-arriendos · /libro-de-donaciones

## Impuestos municipales (4)
- /impuestos-municipales/patente-comercial · /cpt
- /impuestos-municipales/distribucion-de-trabajadores · /certificado-rebaja-inversion

## Tickets (5)
- /tickets/legales · /solicitudes · /anotaciones · /observaciones (Observaciones rentas)
- /tickets/control-hojas-foliadas

## Base Conocimiento (1)
- /base-conocimiento/contenido-normativo

## Otros
- /dashboard · /notificaciones · /mi-perfil · /terminos-y-condiciones · /docs/internal/api

## Observaciones del sistema
- El **dashboard** es un tablero de cartera: F22 del año (enviadas / pendientes / guardadas /
  aceptadas / con reparos / observadas, separando EMPRESAS y PERSONAS) y F29 del mes
  (sin datos / pendientes / aceptadas), más próximos vencimientos y calendario tributario.
- Cabecera con **indicadores del día**: UF, USD, UTM.
- **Campana de notificaciones**: avisos del sistema por empresa y RUT
  ("se ha guardado correctamente el F29 en el SII", "se envió la carpeta tributaria al email").
  Muestran RUT reales y montos → anonimizar siempre.
- El pie del sidebar enlaza a los otros módulos del ERP (Contabilidad y Finanzas, etc.):
  es el conmutador entre Niudata, NiuHR, Niupos y Niutax.
- **Estados de declaración** que aparecen de forma transversal: Enviada, Pendiente,
  Guardada, Aceptada, Con reparos, Observada, Sin datos.

## Datos sensibles propios de este módulo
Además del protocolo general de `docs/ESTADO.md`:
- **RUT de terceros**: aquí no son datos de la empresa titular, son la cartera completa de
  clientes del usuario. Se anonimizan **todos**, no solo el titular.
- Montos de impuestos por empresa identificable → se anonimiza el identificador, el monto puede quedar.
- Notificaciones y correos enviados: contienen emails de destinatarios.
