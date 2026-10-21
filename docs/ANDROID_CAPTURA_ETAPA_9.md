# Etapa 9: Android y captura desde el sistema

## Primera entrega — 2026-10-21

Publicación: implementación guardada en commit local `2abfe4d`. GitHub no fue accesible desde esta máquina en dos intentos de push; no hay PR ni CI remoto de esta rama todavía. Las verificaciones de abajo son locales. El servidor LAN existente en 4300 fue reiniciado y comprobado HTTP 200.

El propietario confirmó los merges y autorizó avanzar. Fetch verificó `origin/develop=6775c1e` (PR #99) y `origin/main=d39d899` (PR #100). Trabajo en la carpeta principal, rama nueva `mejoras/android-captura` desde ese develop. El borrador Gmail sigue archivado en su rama; no se integró.

Se limpiaron los dos MD pendientes de la carpeta principal después de resguardar su diff en `.local/notas-raiz-antes-etapa9.patch`. Los artefactos restantes del worker antiguo se trasladaron a `.local/gmail-worker-resguardo-20261021`. No se borraron credenciales ni se activó Gmail. La configuración LAN existente del puerto 4300 se conserva.

## Qué funciona

- Accesos de la PWA: gasto, ingreso y escribir/dictar. Los dos primeros existían; se añade el tercero y se corrige la continuidad al autenticar.
- La intención de captura pasa por login con contraseña o Google mediante una lista cerrada de acciones. No admite URLs de retorno externas, texto financiero ni importes en la URL.
- Se consume el parámetro al abrir el panel para que recargar no repita la acción. También funciona cuando el router reutiliza Inicio en una app ya abierta.
- Dictar abre el chat. No pide micrófono ni graba automáticamente; el usuario lo activa desde el botón y conserva los permisos/consentimiento existentes.
- Al expirar una sesión se conserva la intención de captura para autenticar de nuevo; no se omite la autenticación.
- La prueba sobre el artefacto de producción usa el service worker real: cerrar la página, reabrir offline, guardar localmente, cerrar otra vez y sincronizar al conectar da exactamente un gasto de 18.25 y saldo 981.75 desde 1000.

La prueba requiere una sesión todavía válida, aplicación cargada antes con conexión y catálogo guardado en el dispositivo. No acredita instalación en Android, proceso del sistema terminado, pantalla bloqueada ni apertura offline por primera vez. Voz/transcripción siguen necesitando conexión. La PWA no sincroniza mientras está cerrada: reanuda al abrirla con conexión. No se cachean respuestas financieras de la API en el service worker; se usa el catálogo local mínimo y la cola por usuario existentes.

## Validación

- Frontend completo: 381 pruebas correctas en 45 archivos.
- 12 E2E correctas: accesos/captura, app-shell móvil, chat y registro rápido; backend local H2 con usuarios sintéticos.
- Tres E2E sobre build de producción y service worker real: reapertura offline y sincronización única; renovación real mediante cookie con token vencido; y reapertura offline con sesión vencida que exige login y conserva el acceso de ingreso. Todas correctas con backend local y usuarios sintéticos.
- Tres regresiones de permisos Web Push: no solicitar al abrir Configuración, no solicitar sin claves y conservar avisos desactivados al denegar permiso. No se envían notificaciones reales. Las pruebas backend existentes `PushPrivacidadTest` verifican ocultación de importes y `RecordatorioNotificacionServiceTest` cubre recordatorios; se inspeccionaron, sin repetir ejecución backend en esta entrega.
- Build Angular producción y comprobación de diff correctos. Auditoría de dependencias correcta: sin vulnerabilidades conocidas en producción, cinco avisos de desarrollo sin parche. El primer intento no devolvió un informe válido; se repitió correctamente. Sin cambios backend ni migraciones en esta entrega; no se repitió su suite completa.
- CI ampliado para ejecutar la prueba PWA después de los flujos normales, también con PostgreSQL. Hasta ejecutar ese CI no confundir validación local H2 con PostgreSQL de esta rama.

Repetir desde `frontend` en PowerShell:

```powershell
npm test -- --watch=false --runner-config=../replica/navegacion-captura/vitest.config.mjs
$env:E2E_FRONTEND_PORT='14208'
npx playwright test accesos-captura app-shell-movil registro-rapido chat-android
npm run build
$env:E2E_FRONTEND_PORT='14209'
npx playwright test -c playwright.pwa.config.ts
```

## Decisiones y fuentes

Primero se mantiene la PWA existente. Los [shortcuts del manifiesto](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/shortcuts) ofrecen accesos del icono en navegadores compatibles; no todos los sistemas los muestran. No se presentan como un tile del panel de ajustes rápidos.

Un [Quick Settings Tile de Android](https://developer.android.com/develop/ui/views/quicksettings-tiles) requiere un servicio nativo y la guía recomienda accesos del launcher para abrir una app. Esta entrega no añade un proyecto Android ni afirma tener ese tile. Evaluar envoltura solo después de probar PWA/autenticación/enlaces en dispositivo.

La [configuración de Angular Service Worker](https://angular.dev/ecosystem/service-workers/config) permite probar el shell compilado y las rutas sin red; el servidor de desarrollo no prueba esa capacidad. El guard devuelve un árbol de redirección para usuarios sin sesión, conforme a la [guía de guards](https://angular.dev/guide/routing/route-guards). La autorización backend permanece vigente.

## Pendientes de la etapa

1. Android físico instalado: accesos, teclado, giro, regreso del fondo, cierre forzado, micrófono permitido/denegado y pantalla bloqueada. Mantener también los pendientes físicos/autenticados de Etapa 8 sin darlos por resueltos mediante su merge.
2. Renovación/reautenticación de sesiones largas en dispositivo. Renovación y reapertura sin red con token vencido ya comprobadas en Chromium con service worker real; falta validar suspensión y cierre por Android. Sin red y con token vencido se exige login, conservando el acceso solicitado.
3. Recordatorios propios y preferencias de privacidad en el dispositivo; evaluar envoltura, enlaces y permisos nativos según los resultados. Widgets después de estabilizar la sincronización.
4. Completar estos criterios antes de cerrar Etapa 9 y pasar a Etapa 11 (compartido, divisas y metas). Gmail, SMS bancarios y lectura de notificaciones ajenas siguen fuera.

Skills usadas: Ponytail, Angular, mobile-native, security-review, Playwright, ecc-verification-loop y documentation-and-adrs. Catálogo local consultable en `.local/SKILLS_DISPONIBLES.md` (no se publica por ser información de esta instalación).
