# Etapa 10: notificaciones consentidas en Android

## Alcance de esta entrega

Rama `mejoras/android-notificaciones-consentidas`, creada desde `origin/develop` actualizado y comprobado en `5de3683`. APK 0.1.4/código 5. El propietario autorizó integrar a develop tras comprobar el head final y CI; producción requiere otra decisión.

La sección «Notificaciones bancarias en este Android» está en Avisos. La recepción empieza desactivada y con selección vacía. Primero explica el acceso amplio que Android concede, después solicita aceptación del alcance y permite abrir ajustes y elegir hasta diez aplicaciones instaladas con actividad de launcher. Conceder el permiso del sistema no activa por sí solo la captura: hay que seleccionar las apps y pulsar Activar. No se solicita QUERY_ALL_PACKAGES, permisos SMS ni accesibilidad. El selector usa la visibilidad de actividades de launcher declarada en `queries`.

Android entrega el paquete del emisor; Kaptal comprueba sesión, selección y paquete antes de leer extras. Se excluyen resúmenes de grupo, eventos persistentes, contenido vacío/excesivo y los indicadores de secretos/tarjetas ya empleados en compartir texto. El filtrado no garantiza detectar todos los secretos ni todas las plantillas bancarias. El usuario debe comprobar qué app está seleccionando y revisar la información antes de enviarla. Android puede ocultar contenido sensible u omitir avisos; Kaptal no intenta recuperarlo por otros medios.

## Decisión: captura local y revisión explícita

El servicio nativo no tiene transporte ni credenciales para enviar al backend. Conserva el original en SharedPreferences privadas, sin backup, bajo el cifrado del almacenamiento Android. La cola está ligada al identificador nativo de la sesión y limitada a 20 pendientes, 100 identidades y 24 horas desde la primera publicación. Al llegar al límite se omiten nuevos avisos y se muestra una indicación genérica; nunca se expulsa un pendiente para sustituirlo silenciosamente. La caducidad se aplica al recibir/consultar; no se promete borrado puntual mientras Android mantiene detenido el proceso.

La lectura nativa oculta los textos mientras el dispositivo está bloqueado. El cambio/cierre de cuenta borra configuración y cola dentro del mismo monitor usado por el servicio. Pausar también borra ambos; revocar el acceso los borra al observar el cambio/desconexión/destrucción o al consultar el estado al volver. Una desconexión con permiso vigente permite rebind. No se consulta `getActiveNotifications`: conceder acceso o reconectar no importa retrospectivamente la cortina del teléfono. La fuerza de detención y las restricciones del sistema pueden causar huecos; se conserva el pendiente ya recibido, sin prometer captura continua.

La interfaz muestra el origen local y abre el formulario ya existente de Avisos con resumen y datos vacíos. Solo la acción «Enviar revisión a mi cuenta» envía los campos revisados mediante `POST /api/avisos`, origen `NOTIFICACION` e identificador `android-notificacion:<UUID>`. El original, el paquete y la clave Android no se envían. El aviso queda PENDIENTE; registrar dinero sigue requiriendo otra acción en la bandeja. No se introducen parsers bancarios automáticos, IA ni una nueva contabilidad.

## Identidad y actualizaciones

Dentro de la ventana local, la clave Android y el paquete identifican una publicación activa; se almacena solo su SHA-256. Repetir contenido conserva UUID y revisión. Actualizar contenido conserva UUID e incrementa revisión; una revisión abierta queda invalidada y debe reabrirse antes de enviar. Una actualización con secretos retira el original pendiente. Tras envío o descarte se quita el texto, conservando una marca durante la ventana para que una actualización no reaparezca como otra compra.

Publicaciones con claves diferentes se conservan aunque tengan el mismo importe/texto. Si Android retira una notificación y el emisor vuelve a publicar esa clave, comienza otro ciclo y requiere revisión. Tras 24 horas, limpieza o reinstalación no existe deduplicación local histórica. La detección de coincidencias financieras existente sigue siendo necesaria, también entre compartir/SMS, WhatsApp y notificaciones. Una coincidencia no demuestra por sí sola que dos compras sean iguales.

Antes del envío se relee el estado nativo y se comprueba identidad/revisión/sesión. Un cambio concurrente posterior conserva el identificador en backend: el contrato existente impide sustituir contenido para una identidad ya recibida. Ante respuesta incierta se reintenta con el mismo identificador; si los campos cambiaron, backend rechaza el reemplazo y la revisión del aviso existente se hace desde la bandeja.

## Pruebas y artefactos

- Frontend: 402 pruebas correctas, incluidos aislamiento, respuestas antiguas, invalidación de revisión y envío mínimo sin confirmación financiera.
- Samsung SM-A546E/Android 16: siete pruebas instrumentadas nuevas de almacén y tres regresiones de compartir correctas.
- Servicio real en Samsung: entrega sintética, actualización con identidad estable, segunda publicación y revocación con borrado automático correctas. Emisor limitado al propio paquete debug durante esa prueba.
- Build web, debug/instrumentación y release firmada correctos. Auditoría: cero vulnerabilidades de producción; cinco alertas de desarrollo conocidas sin parche, documentadas por el verificador existente.
- Recorrido físico por la interfaz, CI y huella final: registrar al terminar las comprobaciones en curso.

El APK de instrumentación contiene una actividad de launcher «Banco sintético Kaptal (pruebas)» para ensayar el selector y el recorrido completo sin elegir apps bancarias del propietario. Este emisor solo produce un texto fijo de prueba; no está en el APK distribuible. POST_NOTIFICATIONS existe únicamente en los manifests debug/instrumentación para ese emisor y las pruebas del servicio. El permiso de escuchar se limita durante QA a Kaptal Pruebas, con selección sintética y restauración posterior. Nunca habilitarlo sobre bancos reales por iniciativa del agente.

## Pendientes y límites de cierre

Quedan la prueba con bancos elegidos por el propietario, formatos reales consentidos, pantalla bloqueada y reinicio completo del teléfono. Las pruebas del almacén con lectura bloqueada y recreación no acreditan esas comprobaciones físicas. También continúan los accesos nativos y la evaluación separada Wallet/Assistant, además de Etapas 12/13. Etapa 10 permanece abierta. Gmail sigue deshabilitado y Etapa 6 omitida.

## Fuentes consultadas

- [NotificationListenerService](https://developer.android.com/reference/android/service/notification/NotificationListenerService): declaración protegida por BIND_NOTIFICATION_LISTENER_SERVICE, callbacks y rebind.
- [Cambios de Android 15](https://developer.android.com/about/versions/15/behavior-changes-all): redacción de OTP y estado de fuerza de detención.
- [Visibilidad de paquetes](https://developer.android.com/training/package-visibility/declaring): consulta por intents en lugar de acceso a todas las apps.

Skills aplicadas: Ponytail, Angular Developer, Security Review, Debugging and Error Recovery, Verification Loop y Documentation and ADRs. La automatización de WebView usa Playwright Android y se distingue de las comprobaciones instrumentadas del servicio y del almacén.
