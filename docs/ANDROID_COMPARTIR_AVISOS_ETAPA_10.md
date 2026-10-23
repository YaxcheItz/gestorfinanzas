# Etapa 10: compartir avisos seleccionados en Android

## Primera entrega, 22 de octubre de 2026

Rama `mejoras/android-compartir-avisos`, creada desde origin/develop comprobado en `55bdfe9`, después de integrar #104. CI final de #104: CI 292/39876160988 y Android 12/39876160968 correctos. El propietario autorizó merges automáticos de este trabajo a develop tras comprobaciones; no implica desplegar a producción. Main continúa en `d39d899`. Esta entrega es solo la primera parte de Etapa 10.

## Comportamiento

Kaptal aparece como destino Android para compartir texto plano, incluido un SMS que el usuario seleccione y comparta desde una app que lo permita. Funciona con arranque frío y con la app abierta. No solicita READ_SMS, RECEIVE_SMS ni acceso a notificaciones.

El original se conserva temporalmente en el almacenamiento privado de la app, con respaldo Android deshabilitado. Límite: un texto de hasta 4000 caracteres, caducidad de 24 horas comprobada al acceder. Repetir el mismo texto pendiente conserva su identificador; otro texto no lo reemplaza y se pide terminar o descartar el anterior. Rechaza antes de conservar textos con indicadores conocidos de claves/OTP/NIP/CVV, números completos de tarjeta y controles no admitidos. No es un detector universal de información sensible.

Antes de iniciar sesión solo se muestra que existe un pendiente. Al asociarlo a una sesión, otras cuentas no reciben el original. El propietario puede volver a la cuenta correspondiente o descartarlo explícitamente. Hay pruebas de aislamiento del almacén nativo y de respuestas asíncronas ante cambio de cuenta; no sustituyen una prueba con dos personas reales.

El usuario abre «Revisar texto compartido» y «Revisar aviso compartido». El original se muestra como texto inerte, sin interpretar HTML. Se completa un resumen separado, importe, cuenta y fecha. El original no se envía completo ni se usa IA. «Enviar revisión a mi cuenta» llama al contrato existente de Avisos con una identidad estable y origen Manual: no se afirma que se verificó la aplicación emisora ni que el texto provenga realmente de SMS.

La recepción crea un aviso PENDIENTE y no cambia dinero. «Guardar movimiento» es la decisión financiera posterior. Cancelar conserva el original local; descartarlo lo retira del teléfono. Un fallo de envío conserva el pendiente y su identidad para reintentar. No hay envío automático al recuperar conexión. Sin red se conserva el original, pero esta entrega no conserva como borrador todos los campos manuales aún sin enviar después de cerrar el proceso.

## Implementación y fuentes

Plugin local SharedNotice registrado en MainActivity, con ACTION_SEND/text/plain. Almacén privado acotado, consumo de intención, identificación y enlace a usuario. Servicio Angular con invalidación de respuestas antiguas y señal filtrada por sesión; interfaz reutiliza AvisosService y AvisosComponent. Sin dependencias nuevas, cambios backend ni migraciones.

- [Recibir texto compartido en Android](https://developer.android.com/training/sharing/receive).
- [Código nativo local con Capacitor](https://capacitorjs.com/docs/android/custom-code).
- [Plugins Android de Capacitor](https://capacitorjs.com/docs/plugins/android).

## Pruebas

- Frontend: **387 pruebas correctas**, incluidas revisión sin envío automático, original excluido del payload, reintento con igual identidad, bloqueo de envío si cambia sesión y respuesta antigua descartada.
- Build web y auditoría correctos; producción sin vulnerabilidades conocidas, excepción de desarrollo braces ya documentada sin ampliarla.
- Builds Android debug, release y androidTest correctos; firma release conservada.
- **3 pruebas instrumentadas correctas en el Samsung** sobre almacenamiento nativo: aislamiento entre identificadores de usuario y persistencia, caducidad, repetición sin cambiar identidad, no sobrescribir pendiente, descarte por identidad, rechazo de indicadores de secretos, tarjeta completa, controles y tamaño excesivo. Se usa un archivo de preferencias de prueba separado.
- WebView del Samsung real y cuenta QA sintética: ACTION_SEND con app cerrada/abierta; repetición conserva clave; abrir/cancelar revisión no envía dinero; captura conservada tras force-stop con Wi-Fi y datos apagados; red original restaurada.
- Envío explícito: exactamente un aviso pendiente de 42.00, sin original en su payload/respuesta y saldo de prueba sin cambiar, 1037.66. Confirmación financiera posterior en UI: un gasto 42.00, saldo 995.66; recarga no duplica. Reintento de recepción con la misma clave devuelve el mismo aviso y conserva saldo.
- OTP sintético recibido por ACTION_SEND rechazado sin crear pendiente. Marcado HTML sintético mostrado como texto, sin ejecutar y descartado sin enviarlo.
- Android reconoce Kaptal como destino de compartir texto. Actualización release instalada sin borrar datos; no se compartieron avisos ni se modificaron movimientos en la cuenta del propietario.

El CI remoto de esta rama debe comprobarse sobre el head del PR antes de integrar automáticamente. Las pruebas financieras son de la app debug física con datos sintéticos; release tiene instalación, firma, versión, arranque y resolución de compartir comprobados. Los detalles privados permanecen en .local.

## APK 0.1.3

- Paquete com.kaptal.app, código 4. Firma SHA-256 `b5f360604095a50f3208299767dcedca2f3acfc5087df8be1fde9cc075c120c3`.
- Archivo `.local/releases/Kaptal-0.1.3.apk`, alias `.local/releases/kaptal-release.apk`; copia en Descargas/Kaptal-0.1.3.apk del teléfono. Versiones anteriores conservadas.
- Tamaño: 3 493 253 bytes. SHA-256 `F38EC1B7535E9B548EF6969395958C1DDFE42731695E7CAADA03B56AD411A169`.

## Pendientes

Integración automática a develop solo tras CI correcto. Siguiente canal en rama distinta: NotificationListener consentido, apps permitidas, filtrado en dispositivo, actualizaciones/repeticiones, permisos revocados, reinicio y bloqueo. No activarlo ni examinar notificaciones bancarias reales por iniciativa propia. Conservar el estudio de viabilidad Wallet/accesos; no prometer lectura universal de pagos. Después Etapas 12 y 13, además de pendientes físicos previos.

No cerrar Etapa 10 con esta entrega. Gmail deshabilitado, Etapa 6 omitida; sin lectura automática de SMS, Play Store ni despliegue nuevo. El backend nuevo de Etapa 11 sigue sin certificarse en producción. Conservar pendiente de expiración aislada de sesión observado en la validación anterior; segunda renovación natural posterior correcta, sin reproducirlo.

Skills: Ponytail, Angular Developer, Security Review, Debugging and Error Recovery, Verification Loop y Documentation and ADRs. Automatización física mediante Playwright conectado a la WebView del teléfono.
