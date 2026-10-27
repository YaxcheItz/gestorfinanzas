# Avisos 0.1.15: recuperación y detalle de envíos

El propietario notificó una compra sin registrar, un envío pendiente sin detalle y la configuración desactivada que impedía añadir otra cuenta. Después de instalar0.1.15 confirmó «La conexión necesita restablecerse. Tus envíos siguen guardados», acreditando la pausa con cola conservada. La reconexión y el resultado financiero aún requieren comprobarse con el propietario. Este incidente tiene prioridad sobre nuevos límites de IA. No se recuperan avisos descartados ni se hacen compras de prueba.

## Fallos encontrados

- El Worker conserva un envío y pausa la conexión ante HTTP401/403/404. El servicio de configuración bloqueaba cualquier renovación con cola pendiente: no había salida para renovar las mismas asociaciones. No se ha identificado todavía cuál de esos estados HTTP ocurrió en el teléfono del propietario.
- Una compra reconocida se guarda directamente en la cola cifrada y no en los avisos manuales. El plugin solo devolvía contadores: el usuario no podía ver qué compra estaba pendiente.
- Las lecturas periódicas añadían trabajos con APPEND_OR_REPLACE; un reintento podía quedar detrás del trabajo que ya esperaba. La recepción normal ahora conserva un único trabajo con KEEP; el reintento explícito y la reconexión reemplazan la espera, conservando el mismo payload e identidad. Se mantiene la deduplicación del backend.
- Santander y BBVA solo ofrecían cuentas de crédito en el formulario, excluyendo débito. Un fallo al listar apps de mensajes también bloqueaba la carga completa aunque solo se usara un banco con aplicación propia.

## Corrección

La reconexión solicita consentimiento y renueva **las reglas guardadas sin cambiar sus identificadores, cuentas ni listas**, incluso con cola pendiente. Android comprueba compatibilidad y apps instaladas antes de rotar la capacidad del servidor. Un cambio de destino con compras pendientes sigue bloqueado; no se redirige dinero a otra cuenta. Un fallo de almacenamiento no se presenta como éxito y la capacidad nueva se revoca según el comportamiento existente.

El detalle muestra banco, resumen, importe, fecha, cuenta y resultado de los envíos conservados, sin credenciales ni texto bancario original. Los importes y números del resumen respetan Ocultar montos. Se distinguen pendiente, registrado y revisión; no se interpreta reconocimiento como movimiento guardado. Al cambiar los resultados se recarga la bandeja de la cuenta, sin reconsultarla en cada lectura local.

La pantalla principal se centra en estado, contadores, Ver envíos y la acción que corresponde. Las asociaciones se agrupan por banco; ayuda y permisos se despliegan solo cuando se necesitan. No se cambian permisos del sistema ni asociaciones al abrir la pantalla. Se conservan Santander solo gastos, Sears física/digital, revisión de coincidencias y límites existentes. Gmail deshabilitado; TalkBack omitido por decisión del propietario.

## Comprobaciones y entrega

- Pruebas de servicio: renovación con cola y reglas originales; consentimiento; sesión cambiada; apps instaladas antes de llamar al servidor; revocación si falla el almacenamiento; reintento nativo sin enviar movimientos desde el formulario.
- Pruebas de componente: cuentas de débito compatibles, catálogo sin depender de apps SMS, recuperación de asociaciones y actualización de la bandeja solo si cambian los resultados.
- Cinco E2E con puentes Android y HTTP ficticios: temas claro/oscuro,320px/horizontal/texto200%, privacidad accesible y cola pausada → reconexión → reintento con destino original. No escriben en producción.
- Diecisiete pruebas instrumentadas de almacén/Worker en el Samsung, con archivos cifrados aislados de Kaptal Pruebas y transporte simulado. Se conserva el payload ante fallos de red, límites y pausa; no se toca la cola real del propietario. Suite frontend completa460correctas; nueve focales correctas tras añadir la prueba del ajuste final de recarga. Build y cinco E2E finales correctos, incluida recuperación a320px con texto200%.
- APK0.1.15/código16 instalada con la misma firma y primera instalación2026-10-22 conservada. SHA256 `A4288C7D6AB0FF1245A9BF6C72A214472CE37E80E50C6AB0587836AE5F774618`; `.local/releases/Kaptal-0.1.15.apk` y Descargas. Diagnóstico del motivo real y resultado del envío pendientes del propietario. HEAD/CI, integración y producción se registran por separado en estado/plan y continuación local.
- Build final preparado tras separar consulta KEEP de recepción APPEND_OR_REPLACE: SHA256 `6BEAD10B6A3940B9F6277A54DE2E2BDD833AA8ECCE01E497D9916D163D778663`. No sustituir la app mientras el propietario está comprobando la reconexión; instalarlo conservando datos al terminar esa comprobación. La interfaz y la recuperación de reglas son las mismas del candidato ya instalado.

La corrección del flujo no acredita todavía el gasto automático real. Tras instalar, revisar el motivo del teléfono y restablecer/reintentar el envío existente con el propietario; comprobar un único gasto en la cuenta correcta. No copiar mensaje, importe, correo ni tarjeta; no borrar datos para salir del bloqueo.

Referencias: [políticas de trabajo único de Android](https://developer.android.com/reference/androidx/work/ExistingWorkPolicy) y [señales de Angular](https://angular.dev/guide/signals), reutilizando las dependencias existentes.
