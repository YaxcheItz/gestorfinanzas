# Etapa 12: acceso Google nativo Android

## Estado vigente: Google 0.1.7 y promoción publicados

Esta sección prevalece sobre los apuntes históricos siguientes, incluidas sus peticiones de aprobación separada y sus estados de OAuth/APK ya superados.

- **Autorización:** publicación permanente autorizada por el propietario tras las comprobaciones. No volver a pedir aprobación de main/producción. No autoriza acciones destructivas, restauraciones de datos ni Gmail; tampoco QA en producción.
- **OAuth público:** el propietario cambió GOOGLE_CLIENT_ID en Render; despliegue terminado. Render directo y Vercel HTTPS responden health UP y config con `877485729157-o5gasaa8saor9ulogjlgfirni6262emv.apps.googleusercontent.com`. Clientes Android release/debug ya creados en el mismo proyecto controlado; no recrearlos ni pedir acceso al proyecto anterior.
- **Login físico:** Google mediante el botón normal de Kaptal Pruebas llegó al dashboard y permitió lectura autenticada de cuentas HTTP200/success. El propietario confirma cuenta esperada y aclara que es reciente, todavía sin cuentas financieras; no afirmar conservación física de cuentas que no existían. Cinco AuthServiceTest cubren continuidad/rechazo de identidad de forma aislada.
- **Logout/cancelación:** cierre real en Configuración/Seguridad, sesión local eliminada; selector Google cancelado con Atrás, retorno al login y reintento habilitado, sin sesión creada. Los intentos incompletos del arnés se resolvieron al corregir navegación/localización del control. Evidencias privadas solo de booleanos: `.local/google-normal-flow-result.json` y `.local/google-normal-logout-cancel-result.json`. No ejecutar `.local/validate-android-live.cjs`, que crea QA productiva.
- **APK/dispositivo:** Samsung SM-A546E conectado. Release 0.1.7/código8 instalada con actualización y login real confirmado por el propietario; misma firma y primera instalación 2026-10-22 00:26:31 conservadas. APK `.local/releases/Kaptal-0.1.7.apk` y Descargas, SHA256 `89A8B40EB6176E2008411B7EC567DBB6103BF8920F622BEA10B51A2D32C8EE03`. Debug sin diagnóstico 0.1.7-pruebas/código8 instalada y detenida; release al frente. Sin borrado de datos ni activación bancaria.
- **Integración:** #117 integrado en develop `59768f690d0e53e27b77c40756951b5b8e5cdf72` tras los 14 checks correctos de `86d0b4368b14a18fa0e6a2a94f36bbb2423a730b` (CI347/348, Android39 y Vercel). CI344/Android37 también pasaron para el anterior aa102bf. Rama nueva de entrega `entrega/promocion-android-0-1-7` desde origin/develop actualizado; documentación de seguimiento aquí.
- **Promoción:** #116 integrado en main `f4aee67d3ff0f35ce49cc89e35337523e68b0a4d` tras 15 checks correctos de `59768f6` (CI349/350, Android40/41 y Vercel). Render y Vercel registran despliegue SUCCESS del commit main; health UP y cliente Google nuevo por HTTPS en ambos. Bundle principal servido y manifiesto coinciden con la entrega. CI351/40066434493 y Android42/40066434483 de main SUCCESS: siete checks posteriores correctos, incluidos E2E/API/PWA. No confundir checks previos de promoción con los posteriores de main.
- **Respaldo/migraciones:** snapshot previo a promoción `.local/promotion-20261024T052812Z/before-main.dump.dpapi`, origen solo lectura, cifrado DPAPI, descifrado/hash y catálogo verificados. Snapshot nuevo no restaurado; ensayo local previo V11–V14 conservó datos, documentado en `ENTREGA_ANDROID_0_1_6_Y_PROMOCION.md`. Consulta productiva posterior de solo lectura confirma V11–V14 aplicadas. No se restauró ni borró producción.
- **Piloto/etapas:** preparación en `PILOTO_SANTANDER_ANDROID_0_1_7.md`; Santander instalado. Configuración real y próximo aviso habitual consentido pendientes, sin compras de prueba. No repetir bloqueo/reinicio, widgets o accesibilidad ya acreditados sin motivo. Etapa10 sigue abierta; Etapas12/13 completas continúan en ramas nuevas desde develop actualizado, diseño al final. Gmail deshabilitado.

Siguiente: integrar la documentación final tras sus checks → configuración Santander con el propietario y próximo aviso habitual → resto de Etapas12/13 en ramas nuevas. Mantener separados CI, integración, APK/dispositivo y producción.


## Apuntes historicos (prevalece el estado vigente anterior)

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
