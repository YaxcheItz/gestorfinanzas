# Etapa 12: acceso Google nativo Android

## Cierre de validaci?n f?sica Google 0.1.7

El propietario confirm? login correcto tambi?n en la release 0.1.7 instalada. Kaptal Pruebas: logout real mediante Configuraci?n/Seguridad, sesi?n local eliminada; selector Google abierto y cancelado con Atr?s, retorno al login, bot?n reintento habilitado y ninguna sesi?n creada. Evidencia .local/google-normal-logout-cancel-result.json (todos los booleanos correctos). El problema del arn?s era localizar el control; se resolvi? usando el bot?n del bloque de seguridad. Los intentos anteriores incompletos no acreditaban fallo del producto. Debug detenida y release al frente, sin nuevos cambios de datos/avisos bancarios.

Preparado para integrar #117 cuando todos los checks del HEAD final sean correctos. Despu?s actualizar #116/develop?main, verificar respaldo actualizado y pruebas exactas antes de promover; publicaci?n autorizada permanentemente. No cerrar Etapa10 ni Etapas12/13 por este incremento. Gmail deshabilitado; piloto Santander pendiente del pr?ximo aviso consentido.

### Avance posterior: login f?sico y APK

Login normal Google en Kaptal Pruebas correcto: dashboard, sesi?n local y lectura autenticada de /api/cuentas con HTTP 200/success. Evidencia .local/google-normal-flow-result.json, solo booleanos/estado HTTP. El propietario confirma acceso correcto y aclara que su cuenta era reciente y a?n no ten?a cuentas financieras; no afirmar conservaci?n de cuentas preexistentes como prueba f?sica. Cinco AuthServiceTest cubren continuidad/rechazo de identidad de forma aislada.

Release 0.1.7/c?digo8 instalada con adb install -r; firma SHA256 b5f360604095a50f3208299767dcedca2f3acfc5087df8be1fde9cc075c120c3 id?ntica a 0.1.6, primera instalaci?n 2026-10-22 00:26:31 conservada. Abierta para login del propietario; confirmaci?n f?sica release pendiente. No se borraron datos ni se activ? registro bancario.

Arn?s de logout/cancelaci?n no concluyente: no registrar PASS. La primera navegaci?n directa del arn?s no carg? la SPA correctamente; selector nativo/Http nativo tampoco debe medirse mediante eventos HTTP de Playwright. Sesi?n real verificada por lectura nativa autenticada. Pendiente completar cierre/cancelaci?n y dejar debug detenida.

Respaldo actualizado .local/promotion-20261024T050844Z/before-main.dump.dpapi: dump en modo solo lectura, cifrado DPAPI, descifrado/hash y cat?logo correctos. Este snapshot nuevo a?n no se restaur?; ensayo V11?V14 anterior documentado en docs/ENTREGA_ANDROID_0_1_6_Y_PROMOCION.md. No se escribieron/restauraron datos productivos.

## Verificaci?n vigente tras despliegue OAuth (2026-10-24 UTC)

Esta secci?n prevalece sobre los estados hist?ricos siguientes. El propietario ya cambi? GOOGLE_CLIENT_ID en Render y confirma despliegue terminado. Se verificaron directamente Render y el proxy HTTPS Vercel: /api/health UP y /api/auth/google/config con el nuevo cliente web del proyecto 877485729157. Este cambio de configuraci?n no equivale a promover develop a main ni acredita V11?V14 en producci?n.

Autorizaci?n permanente vigente para publicar tras comprobaciones; no pedir aprobaci?n separada de main/producci?n. No autoriza destrucci?n/restauraci?n de datos ni Gmail. Clientes web/Android ya creados: no pedir recrearlos ni buscar acceso al proyecto anterior.

Git confirmado: rama mejoras/android-google-nativo-etapa-12, HEAD aa102bfcb6c813257ddb2227487a4774c144e45a; origin/develop d3e97da16dc3e873382af38b7874461a7fea5c3e, origin/main d39d89952a18959511032880457aaccff4bb5f66. #117 y #116 abiertos y en borrador. CI344/40064325188 y Android37/40064325225 SUCCESS para aa102bf. Documentaci?n local previa conservada; revalidar CI si cambia HEAD.

Samsung SM-A546E conectado por ADB. Release com.kaptal.app contin?a 0.1.6/c?digo7, datos intactos. Debug sin diagn?stico compilada e instalada con adb install -r: 0.1.7-pruebas/c?digo8, SHA256 64CC144F3B90979B7F7E58FD5793A7D846209C80CAAA4144A1B9E0D782002AF7. APK release preparada 0.1.7 mantiene SHA256 89A8B40EB6176E2008411B7EC567DBB6103BF8920F622BEA10B51A2D32C8EE03; a?n no instalada sobre release.

Prueba normal en curso: bot?n expl?cito de Kaptal Pruebas, selector elegido por propietario. A?n no afirmar sesi?n real ni continuidad de cuenta. Arn?s privado .local/check-google-normal-flow.cjs registra solo booleanos/estado HTTP, no cuerpos de autenticaci?n ni datos personales. No ejecutar validate-android-live.cjs: crea QA productiva y contradice l?mites actuales.

Pendientes: completar login y continuidad de cuenta habitual; cancelaci?n/logout cuando corresponda; actualizaci?n release conservando firma/datos; documentos y checks del HEAD final #117, integraci?n develop, actualizar #116 y respaldo cifrado antes de promoci?n, backend/ frontend y migraciones/HTTPS despu?s. Piloto Santander con pr?ximo aviso habitual consentido, sin compras de prueba. Etapa10 y Etapas12/13 siguen abiertas; dise?o al final. No repetir ciclo f?sico/widget/accesibilidad ya acreditados sin motivo.

## Resultado vigente: cliente del proyecto controlado validado

El propietario creó un cliente web junto a los clientes Android en su proyecto 877485729157. El backend público todavía entrega un cliente de 809732796581, proyecto al que el propietario no acredita acceso. Los intentos anteriores con esa audiencia fallaban dentro del proveedor, antes del backend.

Prueba física aislada usando la audiencia web nueva: Credential Manager devolvió el ID token; `jose` verificó firma RS256 con claves públicas Google, audiencia exacta, emisor, expiración/edad máxima y correo verificado. Token y datos de identidad solo en memoria; evidencia de booleanos en `.local/google-native-new-client-isolated-result.json`. No se llamó al login productivo ni se creó usuario, sesión o movimiento. Debug detenida al cerrar. Se retiró el log temporal de diagnóstico del plugin.

Pendiente: comprobar continuidad de identidad con pruebas aisladas, aprobar por separado el cambio productivo de `GOOGLE_CLIENT_ID`, realizarlo en Render y verificar config pública, login real y cuenta habitual. La prueba del token no acredita sesión emitida por el backend ni permisos bancarios. Conservar valor anterior para reversión de configuración autorizada; no tocar DB ni migraciones. #116 sigue en borrador y esta transición de configuración no autoriza su merge.

Las instrucciones históricas siguientes exigían acceso al proyecto OAuth original. Ya no se debe pedir buscarlo: la transición preparada utiliza el proyecto que controla el propietario. Gmail permanece deshabilitado; su cliente Desktop no cambia y no se solicitan scopes Gmail/Drive.

## Comprobación tras reconectar

Build Android compatible debug/release, lint y JVM correctos. Una prueba instrumentada en Samsung aprobó rechazo de configuración inválida y cierre de sesión nativo. Seis pruebas del componente y 18 focalizadas iniciales correctas; build web correcto. No acredita login Google real ni cancelación del selector del proveedor.

APK 0.1.7/código 8 firmada con el mismo certificado release, verificado. SHA256 `89A8B40EB6176E2008411B7EC567DBB6103BF8920F622BEA10B51A2D32C8EE03`; copias en `.local/releases/Kaptal-0.1.7.apk` y Descargas. Sigue pendiente configurar los dos clientes OAuth Android y validar el acceso real antes de sustituir la release instalada.

El propietario utiliza solo Google, por lo que correo/contraseña no resuelve el acceso a su APK. Piloto elegido: Santander, con su próximo aviso real habitual. La promoción #116 permanece pendiente mientras se prepara/valida este acceso; no activar el registro bancario de release ni hacer compras de prueba.

Rama nueva `mejoras/android-google-nativo-etapa-12` desde develop actualizado `d3e97da`. Credenciales AndroidX 1.6.0 estable y googleid 1.1.1, artefactos verificados en documentación/repositorio Maven oficiales y elegidos para el toolchain actual. APK prevista 0.1.7/código 8. No se solicita acceso a Gmail, Drive ni al buzón; solo autenticación Google existente.

## Configuración que debe revisar el propietario en Google Cloud

1. Abre https://console.cloud.google.com/auth/clients y selecciona el mismo proyecto del cliente OAuth web que ya usa Kaptal (`GOOGLE_CLIENT_ID` del backend). No crees otro proyecto ni cambies/elimine el cliente web existente.
2. Crea un cliente OAuth **Android**, nombre «Kaptal Android», paquete **`com.kaptal.app`**, SHA-1 **`05:33:7F:B5:A8:07:CE:BE:12:3C:19:F8:E9:1A:79:00:6C:65:3D:EF`**. Esta huella corresponde a la firma release existente, verificada sobre 0.1.6; la actualización 0.1.7 debe conservarla.
3. Crea otro cliente OAuth **Android**, nombre «Kaptal Pruebas», paquete **`com.kaptal.app.debug`**, SHA-1 **`7D:0B:19:19:13:AC:7F:E9:C2:E9:D5:90:C7:C2:9C:0C:42:7A:81:46`**. Es la firma debug de este equipo, no la release.
4. Si el consentimiento del proyecto está en modo de prueba, comprueba que tu cuenta Google está autorizada como usuario de prueba. No publiques tu correo ni claves en el repositorio/chat.
5. No añadas permisos Gmail/Drive ni cambies la configuración de correo. El cliente que se envía al SDK como audiencia sigue siendo el **web** del backend; los clientes Android vinculan paquete y certificado. No se necesita introducir un secreto OAuth en la APK.
6. Guarda y confirma que ambos clientes Android existen. La prueba real exige elegir tu cuenta en el selector nativo del teléfono y comprobar que el backend emite la sesión de Kaptal; compilar no acredita ese login.

## Contrato y revisión

Botón solo por gesto explícito, sin selección automática. ID de cliente recibido desde `/api/auth/google/config`; el plugin valida el formato, exige teléfono desbloqueado y admite una solicitud en vuelo. Credential Manager obtiene el ID token y el componente lo entrega únicamente en memoria al flujo `loginWithGoogle` existente. El backend conserva la validación de firma, audiencia, emisor, vencimiento y correo verificado. No guardar ni registrar el ID token. Cancelar permite reintentar; navegación/destrucción descarta respuestas tardías. Logout persiste primero la marca de cierre y borra la cola local; también notifica al proveedor mediante `clearCredentialStateAsync`.

La llamada no añade nonce de servidor: se conserva el contrato de ID token ya usado por la web. No presentar un nonce solo local como protección de replay de servidor. No se añaden scopes de autorización de datos ni APIs Gmail.

Pendiente: configuración OAuth del proyecto, cancelación real del selector y login real consentido. Las pruebas unitarias de cancelación y la prueba física de cierre del puente ya pasaron; no equivalen a probar el selector con la cuenta habitual. Solo después actualizar la release del propietario. Etapa 12 completa aún incluye onboarding, privacidad/bloqueo nativo y auditoría accesible más amplia; este incremento no la cierra. Main/producción requieren la aprobación separada acordada.

Referencias oficiales: [implementación Credential Manager](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation), [versión estable AndroidX](https://developer.android.com/jetpack/androidx/releases/credentials), [API Java asíncrona](https://developer.android.com/reference/androidx/credentials/CredentialManager), [marca del botón](https://developers.google.com/identity/branding-guidelines). Icono descargado de https://developers.google.com/static/identity/images/g-logo.png. Las huellas y paquetes anteriores son identificadores públicos, no secretos.

Compatibilidad: googleid 1.1.1 usa metadatos/dependencias Kotlin 1.8 del repositorio Maven oficial y mantiene las APIs de botón/ID token necesarias. Se conserva AGP 8.13.0 y Gradle 8.14.3. La variante 1.2.1 produjo avisos de reescritura de metadatos tanto con AGP 8.13.0 como 8.13.2; se eligió la combinación compatible 1.1.1, cuyo build final y prueba física del puente pasaron. Fuentes: https://dl.google.com/dl/android/maven2/com/google/android/libraries/identity/googleid/googleid/1.1.1/googleid-1.1.1.pom y https://developer.android.com/build/kotlin-support. Pruebas focalizadas iniciales: 18 correctas; seis del componente correctas, incluida regresión web; build web correcto.
