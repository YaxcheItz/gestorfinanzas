# Etapa 12: acceso Google nativo Android

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
