# American Express e ingresos Revolut

Entrega en rama `mejoras/avisos-amex-revolut`, desde develop remoto comprobado `e9196445af8377eb42f825a1a062d9dcbc4af120`. Corrige formatos aportados por el propietario sin guardar sus ejemplos reales en el repositorio. Requiere Android 0.1.16/código 17 y backend actualizado.

## American Express

La app mexicana permitida puede emitir el comercio en el título y `Gastaste $<importe> Gastos de hoy: $<total>` en el cuerpo. El parser toma solamente el primer importe; el total diario no genera otro cargo. Admite separación por espacio o salto de línea. Exige importe positivo, texto completo y comercio válido; no acepta otro paquete, divisas explícitas ajenas, rechazo, devolución, códigos o texto añadido.

Este formato no identifica tarjeta. Solo se registra con una asociación inequívoca y terminación vacía. Una terminación configurada se respeta: si el aviso no permite comprobarla, permanece para revisión. No se quita una terminación existente automáticamente ni se elige la primera cuenta disponible.

El clasificador distingue la expresión completa Uber Eats de Uber: reparto de comida → Comida; Uber sin Eats → Transporte. Se conservan detección de actividades ambiguas, intermediarios, categorías archivadas, categoría fija y correcciones manuales. No se reclasifica el historial.

## Revolut

El propietario autorizó incluir ingresos y confirmó MXN para los avisos con símbolo de dólar. Se añade `ingresosMxn` opcional a la regla, desactivado por defecto y en conexiones antiguas. Se guarda con el consentimiento de la conexión; restablecer no lo activa por su cuenta.

Se reconoce el título de pago recibido con importe positivo y el cuerpo completo de pago enviado de persona a persona, incluyendo la separación tipográfica de «envió». Una divisa explícita distinta, texto incompleto, cancelación o paquete ajeno no se registra. El símbolo de dólar sin divisa solo se interpreta como MXN tras ese consentimiento específico. No cambia la política de compras Revolut en otras monedas.

El movimiento se envía como INGRESO con descripción fija «Ingreso Revolut», sin nombre del remitente, texto original ni categoría de gasto. El backend exige consentimiento guardado y una cuenta Revolut de débito MXN. Un ingreso sin tarjeta puede dirigirse solo a una asociación consentida inequívoca; varias asociaciones compatibles requieren revisión.

## Configuración y conservación

En Avisos → Administrar bancos → Revolut aparece la opción para ingresos MXN. Guardar una asociación que conserva proveedor, origen, tarjeta, cuenta y lista mantiene su identificador y categoría fija; esto conserva Sears física/digital y los demás bancos. No se cambian asociaciones con envíos pendientes. Modificar el consentimiento forma parte del cambio de regla; no puede ocultarse dentro de una renovación con pendientes.

Las recepciones nuevas pasan por cola cifrada, capacidad por dispositivo, comprobación de propiedad y deduplicación existentes. Reentregar el mismo evento conserva un único movimiento y su saldo. Los posibles duplicados siguen requiriendo revisión. Santander continúa solo gastos; Gmail deshabilitado, Desktop intacto y TalkBack omitido.

## Comprobaciones

- Regresión del parser American Express reproducida antes de corregir; ejemplos de prueba ficticios.
- Backend local: 568 casos, cero fallos/errores, ocho PostgreSQL omitidos en H2 y reservados para CI. Incluye saldo de ingreso, reintento, consentimiento, conexiones antiguas, monedas y categorías.
- Frontend: 462 pruebas en la primera suite completa; comprobación focal posterior del consentimiento y conservación de asociaciones.
- Android: unitarias, lint, APK debug, instrumentación y APK release compilados. Cola cifrada: 16 pruebas físicas iniciales correctas en app debug aislada; comprobación final Store/Worker y publicación se registran por separado en la continuación.
- Interfaz: cinco E2E locales sobre build productivo, temas claro/oscuro, 320 px, horizontal, letra 200% y ocultación de montos. Fixtures sin escrituras financieras reales.

El registro productivo de estos formatos y la primera categoría real siguen pendientes de avisos habituales futuros. No se han hecho compras, QA productiva, recuperaciones de descartados ni importaciones retroactivas. Los ejemplos pegados en el chat no registran movimientos. CI, integración, despliegue e instalación se detallan en estado/plan y `.local/CONTINUAR_AVISOS_AMEX_REVOLUT.md`.
