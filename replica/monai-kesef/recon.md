# MonAi y Kesef: alcance para Kaptal

Revisión pública: 2026-10-14. Android personal como destino principal; web conservada. Referencia principal: MonAi. Implementación propia sobre Angular/Spring Boot/PostgreSQL, conservando marca, recursos y datos de Kaptal. No se accedió a cuentas privadas ni se comprobó paridad ejecutando las aplicaciones originales. Los estados siguientes son propuestas para Kaptal, no pantallas observadas en una cuenta de MonAi.

## Fuentes y diferencias de plataforma

[FAQ oficial de MonAi](https://get-monai.app/faq): documenta voz/texto, listas compartidas, presupuestos, etiquetas, recurrencias y CSV. Android captura notificaciones bancarias; SMS/correo mediante Atajos, widget de voz e informes IA beta corresponden a iOS. Sus barras permiten acceder al presupuesto. La moneda de una lista no convierte movimientos históricos. No confundir balance mensual con saldo bancario. Confianza alta sobre funciones documentadas; no sobre detalles internos.

[Kesef oficial](https://getkesef.app/): aporta periodos con inicio elegido, reparto por porcentajes/partes/importes, metas y conexión con Mercado Pago. La autorización e importación histórica que anuncia no demuestran que una API pública permita replicarla para cualquier cuenta: verificar contrato oficial antes de implementarla. Confianza alta sobre la oferta publicada, pendiente sobre integración técnica propia.

## Inventario de pantallas y flujos propuestos

| ID | Pantalla Kaptal | Flujo y estados que debe cubrir |
|---|---|---|
| S01 | Inicio | Saldo actual, flujo del periodo, barras, recientes; carga, vacío, error, offline y privacidad |
| S02 | Captura | F01: abrir Añadir → importe/categoría/cuenta → guardar; validación, offline, reintento idempotente |
| S03 | Voz/texto | F02: dictar/escribir → propuestas separadas → corregir → confirmar; ambigüedad y fallo de IA |
| S04 | Actividad/detalle | F03: buscar → editar/repetir; filtros, monedas separadas y eliminación confirmada |
| S05 | Presupuestos | F04: barra → presupuesto → modificar límite; normal, alerta y exceso |
| S06 | Reportes | F05: periodo/moneda → categorías/tendencia; datos vacíos, privacidad y reintento |
| S07 | Compartido | F06: invitar → repartir → registrar liquidación; consentimiento, salida y permisos |
| S08 | Automatizaciones | F07: fuente autorizada → evento → propuesta → confirmar; duplicados, rechazo y desconexión |
| S09 | Acceso Android | F08: baldosa de ajustes rápidos → captura; sesión bloqueada, offline y retorno a la aplicación |
| S10 | Ajustes | Temas, privacidad, exportación/importación, recurrencias e integraciones |

Componentes: selector de periodo, selector de moneda, barra de presupuesto, fila de movimiento, hoja de captura, propuesta revisable, indicador de sincronización y panel de secciones. No añadir accesos a todas las funciones en Inicio.

## Automatización: arquitectura propuesta, todavía sin implementar

- Notificaciones: contenedor Android con servicio nativo y consentimiento para acceso a notificaciones. Lista permitida de paquetes bancarios; descartar avisos ajenos en el dispositivo antes de cualquier envío. No usar un permiso de notificaciones push como si concediera lectura de otras aplicaciones. API: [NotificationListenerService](https://developer.android.com/reference/android/service/notification/NotificationListenerService).
- Acceso desde la cortina: una baldosa «Añadir gasto» abre la captura existente; es distinta de un widget de escritorio y de una notificación persistente. El usuario añade la baldosa al panel. Requiere módulo Android, no basta la PWA: [Quick Settings / TileService](https://developer.android.com/develop/ui/views/quicksettings-tiles).
- SMS: empezar por compartir/pegar un aviso seleccionado. La lectura automática requiere permisos nativos; Google Play contempla una excepción para gestión financiera por SMS, sujeta a revisión. No asumir que está prohibida ni aprobada: [política oficial](https://support.google.com/googleplay/android-developer/answer/10208820).
- Correo: primera integración limitada a remitentes bancarios elegidos, proveedor y consentimiento explícitos. Un filtro de Gmail no reduce por sí solo el alcance del permiso OAuth. `gmail.readonly` es restringido; evaluar verificación y evaluación de seguridad antes de almacenar/transmitir estos datos: [scopes oficiales](https://developers.google.com/workspace/gmail/api/auth/scopes). No reutilizar el permiso de inicio de sesión con Google para leer correos.
- Motor compartido: reglas deterministas por banco → clasificación local → IA opcional ante ambigüedad → propuesta persistida existente. No convertir un aviso incompleto en gasto confirmado. Permitir revisar y corregir; automatismo posterior únicamente por regla autorizada y con reversión.

Modelo inferido para implementar: FuenteCaptura (propietario, canal, remitente/paquete permitido, consentimiento, estado); EventoCaptura (identificador de fuente, huella, fecha, estado); Propuesta existente vinculada al evento. Diseñar deduplicación entre correo/SMS/notificación y captura manual, no sólo dentro de cada canal. No deduplicar únicamente por importe y día: dos compras iguales pueden ser reales. Distinguir cargo, devolución, transferencia, pago de tarjeta, autorización pendiente y cargo definitivo. Mantener aislamiento por usuario y excluir códigos OTP, números completos y mensajes ajenos de logs/IA.

## Orden de construcción y aceptación

1. Terminar y revisar el rediseño actual. Barras visibles, cuatro destinos inferiores, rutas conservadas, sin contenido duplicado; pruebas con monedas y privacidad.
2. Nueva etapa desde develop integrado: bandeja de propuestas de avisos y parser de un banco con ejemplos anonimizados. Casos obligatorios: mismo aviso repetido, dos compras idénticas reales, importe ausente, devolución y pago de tarjeta. Ningún evento altera saldos antes de confirmarse.
3. Contenedor Android conservando Angular y backend; baldosa de captura y servicio de notificaciones. Probar en teléfono real con acceso revocado, sesión cerrada y modo offline.
4. Correo según proveedor elegido; SMS automático según distribución/permisos. Probar desconexión, renovación/revocación, cursor y reintento sin duplicación.
5. Completar diferencias de MonAi: etiquetas/listas, edición de recurrencias por alcance e informes consultables; sumar de Kesef periodos propios, reparto flexible y metas. Validar comportamiento contable antes de ampliar navegación.

Estado por función en [features.csv](features.csv). Cada etapa nueva usa rama distinta; este documento no afirma que las integraciones estén activas. Faltan bancos/proveedor, ejemplos anonimizados y validación física Android. No hay despliegue ni conexiones privadas realizadas.
