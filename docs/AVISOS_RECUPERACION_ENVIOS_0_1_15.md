# Avisos 0.1.15: recuperación y detalle de envíos

El propietario notificó una compra sin registrar, un envío pendiente sin detalle y la configuración desactivada que impedía añadir otra cuenta. Después de instalar0.1.15 confirmó la conexión pausada con cola conservada; al restablecer las mismas reglas se registró el gasto sin guardarlo manualmente. Después del build final funcional confirmó **Santander, una sola vez y cuenta correcta**. La recuperación del envío real quedó acreditada; no equivale a prueba universal de bancos/formatos ni de una nueva compra posterior. No se recuperaron avisos descartados ni se hicieron compras de prueba.

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
- APK0.1.15/código16 funcional instalada con la misma firma y primera instalación2026-10-22 conservada, SHA256 `6BEAD10B6A3940B9F6277A54DE2E2BDD833AA8ECCE01E497D9916D163D778663`. Fuente funcional `63fee43c958d996072642a403da645ad63a06ae3`; Android83/40450942204 SUCCESS. CandidatoA428 anterior sustituido. HEAD/CI, integración y producción se registran por separado en estado/plan y continuación local.
- CI429/40450919957 y CI430/40450942269 detectaron un desborde real de14px en el estado de permisos a320px/texto200%. Se permite envolver la fila y el estado; las E2E esperan la fuente antes de medir, sin reducir la exigencia. Preparar build con este ajuste CSS para cuando vuelva el teléfono, que el propietario desconectó. La lógica financiera no cambia respecto al build con recuperación real comprobada.

### Entrega integrada y publicada

- Fuente final `ac67a6dcd7dcffbfed878dddf7db49d47ae24e4f`: CI431/40524638809, CI432/40524648980 y Android84/40524648947 SUCCESS; catorce checks y Vercel correctos. #145 integrado en develop `eed2c7b1420f0049bc0f9a47aadff264fb574b0f`. CI frontend:461pruebas correctas. Cinco E2E productivos y cinco sobre servidor de desarrollo correctos con fuente cargada. Build inicial JS125811bytes gzip/CSS18384bytes gzip.
- #146 promovido después de CI433/40527879407, CI434/40527947449 y Android85/40527879347/86/40527947376 SUCCESS, quince checks y Vercel correctos. Main `5f698add4c32e74f92bdba7be29a95caa2bbc53a`. Seguimiento de CI posterior435/40531319478 y Android87/40531319234 en la continuación/evidencia privada; consultar GitHub antes de retomar.
- Render7362703694 y VercelProduction7362715543 SUCCESS. A las2026-10-27T15:34:28Z pasaron65JS/CSS/manifiesto, health directo/proxy HTTPS y Google. Esquema de solo lectura15:33:02Z: V11–V14, sin nueva migración. Los seis estáticos que diferían del build Windows coinciden exactamente con los bytes canónicos de Git; solo cambiaban CRLF/LF locales. No se relajó la validación de contenido.
- Respaldo previo `.local/promotion-20261027T152734Z/before-main.dump.dpapi`, cifrado/descifrado/hash/catálogo comprobados, origen de solo lectura y sin restauración.
- APK con ajuste CSS final preparada y firmada, **no instalada** por desconexión del teléfono: `.local/releases/Kaptal-0.1.15.apk` y Descargas, SHA256 `85A337B3C968C28DA30F2ACCC0426FAD5755E1FE53B2E21810BC61BCDD7980C0`,0.1.15/código16. El build6BEAD continúa como instalado y probado funcional; no confundir ambos hashes ni solicitar otra compra para comprobar el ajuste CSS.

La recuperación real de Santander está comprobada. Quedan observación del funcionamiento habitual y otros bancos/formatos, sin solicitar compras para probar. No copiar mensaje, importe, correo ni tarjeta; no borrar datos para salir de un bloqueo. Categorización automática con fallback Otros gastos y revisión funcional de categorías/etiquetas se añadieron al plan a petición del propietario, sin implementarlas dentro de esta corrección.

Referencias: [políticas de trabajo único de Android](https://developer.android.com/reference/androidx/work/ExistingWorkPolicy) y [señales de Angular](https://angular.dev/guide/signals), reutilizando las dependencias existentes.
