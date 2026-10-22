# Validación Android en Samsung

## Sesión del 22 de octubre de 2026: en curso

Rama `validacion/android-fisico-0-1-1`, creada desde `origin/develop` comprobado en `c46d090`. `origin/main` permanece en `d39d899`; sin merge ni despliegue nuevos. El propietario autorizó instalar, probar y corregir fallos, preservando sus datos financieros reales.

### Comprobado en el teléfono

- Samsung SM-A546E, instalación de la APK release mediante actualización `adb install -r`, sin desinstalar. El instalador confirmó `Success`.
- Consultado posteriormente por ADB inalámbrico: paquete `com.kaptal.app`, versión 0.1.1, código 2; `lastUpdateTime=2026-10-22 13:40:24`. Conserva `firstInstallTime=2026-10-22 00:26:31`.
- Arranque frío confirmado por Android y pantalla Inicio visible en el teléfono, con sesión conservada. Esto no certifica todavía que carguen todas las cifras ni una renovación de sesión correcta.
- No se crearon cuentas de prueba ni movimientos, y no se cerró la sesión del propietario. No se borraron datos ni se reinstaló desde cero.

### Incidencia de conexión

ADB USB se conecta de forma intermitente y después pierde el transporte o se bloquea. Se compararon las versiones oficiales 37.0.1 y 36.0.2 y las alternativas USB; ninguna quedó estable. La versión alternativa se descargó a `.local/adb-36`, sin reemplazar el SDK. Se observó también otro cliente ADB consultando una aplicación distinta; esto no prueba que sea la causa.

Con autorización y código temporal del propietario se vinculó ADB inalámbrico. Permitió consultar la versión, abrir la app, obtener pantalla y registros; posteriormente el enlace quedó offline y el puerto dejó de responder. No conservar el código de vinculación en documentación ni Git. Se pidió reactivar Depuración USB con el cable conectado para continuar.

Fuentes de diagnóstico: [notas oficiales de Platform Tools](https://developer.android.com/tools/releases/platform-tools) y [ADB y vinculación inalámbrica](https://developer.android.com/tools/adb).

### Preparación para pruebas sin afectar al propietario

La instalación normal contiene una sesión. La variante debug anterior usaba el mismo identificador que release; ahora usa `com.kaptal.app.debug`, nombre «Kaptal Pruebas» y sufijo de versión `-pruebas`, con almacenamiento separado. Se habilita inspección de WebView solamente cuando Android marca la compilación como depurable; release conserva la inspección desactivada.

Compilados correctamente `:app:assembleDebug` y `:app:assembleDebugAndroidTest`. Verificado el identificador del APK debug mediante aapt. La app de pruebas aún no está instalada ni certificada físicamente. No se modificó el frontend financiero ni el backend. Estos resultados de compilación no sustituyen la ejecución instrumentada.

La automatización prevista conecta Playwright a la WebView del propio Samsung; no a un navegador de escritorio emulando Android. Las credenciales y evidencias privadas permanecen en `.local`, fuera de Git. Referencias: [Playwright Android](https://playwright.dev/docs/api/class-android) e [inspección de WebView limitada a debug](https://developer.chrome.com/docs/devtools/remote-debugging/webviews/).

### Pendientes

Estabilizar ADB → instalar Kaptal Pruebas → cuenta sintética y login → operaciones con saldo/historial → cierre/reapertura, fondo y renovación → captura offline, muerte del proceso y sincronización única → accesibilidad, teclado, orientación y privacidad. Las pruebas deben distinguir APK release, APK debug física, simulaciones y producción.

No desactivar la única conexión de control durante una prueba offline sin contar con restauración de red segura. No usar movimientos del propietario como fixtures. Metas y demás endpoints nuevos requieren backend actualizado en producción; no desplegar por iniciativa propia.

Después: Etapa 10 sin Gmail, Etapa 12, Etapa 13 y revisión final. Gmail deshabilitado y Etapa 6 omitida. Cada etapa nueva debe empezar en otra rama desde develop actualizado.
