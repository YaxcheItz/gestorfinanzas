# Base Android y APK de Kaptal

## Alcance y orden

Rama `mejoras/android-apk`, creada desde `origin/develop` revalidado en `3af6e80` el 22 de octubre de 2026. El PR #102 de Etapa 11 permanece abierto y con CI final verde; no se integra automaticamente. Esta base se prepara de forma independiente: el APK no incorpora las metas/divisas del PR #102 hasta integrar y actualizar las ramas.

Orden autorizado: Etapa 11 → base Capacitor/APK → Etapa 10 sin Gmail → 12 → 13 → revisión final. Etapa 9 se considera completada provisionalmente por decisión del propietario; se conservan los pendientes físicos anteriores.

## Implementación

- Capacitor 8.5.3, identificador `com.kaptal.app`, versión inicial 0.1.0/código 1, Android 7/API 24 o posterior, compile/target API 36.
- Angular se incluye dentro de la APK; no se configura `server.url` ni navegación remota permitida. Service worker desactivado en Android para evitar una segunda actualización independiente de los archivos firmados. La PWA conserva su service worker.
- API fija `https://kaptalgf.vercel.app/api`, a través del proxy existente hacia Render. HTTP nativo de Capacitor transporta las solicitudes y cookies; no se habilita CORS global ni se cambian secretos de producción. El interceptor mantiene el token limitado al origen/ruta de la API. Cookie de renovación sigue administrada por el servidor; no se copia a localStorage.
- Sin tráfico HTTP claro, contenido mixto, depuración WebView de release, logging de Capacitor ni copia automática Android. Solo permiso INTERNET. Firma release local fuera de Git.
- Plugin App conecta Atrás al historial y minimiza al llegar a la entrada. Icono vectorial derivado del SVG propio y pantalla de arranque Kaptal.
- En APK se explica que el acceso Google está disponible en la web; el botón web GIS no se carga dentro de Android. Para Google en APK falta integrar un flujo nativo autorizado. Correo/contraseña conserva el flujo existente; si la cuenta solo usa Google puede establecer contraseña con la recuperación de la web.
- Override limitado `xcode → uuid ^11.1.1` resuelve la alerta introducida por el CLI. Vitest actualizado a 4.1.12, igual que el PR #102. No se amplían excepciones de auditoría.

## Compilar y firmar en Windows

Requisitos: Node >=22, dependencias `npm ci` en frontend, Java compatible con Gradle 8.14.3 (Java 23.0.2 local), Android SDK API 36 y build-tools 36.0.0. En CI Java 21. Si el SDK no está en `%LOCALAPPDATA%/Android/Sdk`, definir `ANDROID_HOME`.

Desde la raíz:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File frontend/scripts/build-android.ps1
```

La primera ejecución genera `.local/android-signing/kaptal-release.jks` y `signing.json` con contraseña aleatoria. Los siguientes builds reutilizan la misma identidad de firma. Ambos archivos son privados y necesarios para conservar las actualizaciones; guardarlos juntos en un respaldo privado y no enviarlos al chat ni subirlos al repositorio. Si se pierde la clave no se podrá actualizar una instalación existente conservando su firma.

Salida verificada con apksigner: `.local/releases/kaptal-release.apk` y SHA-256 en consola. El script falla si compilación o firma no pasan. Para depuración usar `-DebugBuild`; una instalación debug usa otra firma y no actualiza una release.

Para una nueva entrega incrementar `versionCode` y `versionName` en `frontend/android/app/build.gradle`, volver a compilar y distribuir la nueva APK firmada con la misma clave. No publicar el almacén de firma. La entrega local no equivale a un despliegue web o una publicación en Play Store.

CI Android compila APK debug e instrumentación, y conserva el APK de prueba como artefacto 14 días. No contiene la firma privada release. Las pruebas instrumentadas necesitan dispositivo; el job CI solo las compila.

## Validación y pendientes

Build web y 382 pruebas frontend correctas. Auditoría: cero vulnerabilidades en producción; solo cinco alertas de desarrollo ya conocidas de braces. La prueba nueva verifica que la API Android no admita sobreescritura runtime hacia otro host.

Pendientes de confirmar al cerrar esta entrega: build/firma Android, ejecución instrumentada física, CI remoto y disponibilidad del APK. No certificar sesión larga/renovación, regreso del segundo plano, teclado/gestos, offline/sincronización ni operaciones financieras Android sin sus pruebas.

Etapa 10 y ampliaciones nativas pendientes: entrada por compartir/avisos/SMS seleccionados sin Gmail, widgets, accesos rápidos, notificaciones nativas, integración Google nativa y exportación/compartición de archivos Android. Un WebView no convierte automáticamente descargas Blob, Web Push o dictado del navegador en funciones Android. Revisar cada capacidad antes de declararla operable en la APK.

Fuentes oficiales consultadas: [instalar Capacitor](https://capacitorjs.com/docs/getting-started), [configuración](https://capacitorjs.com/docs/config), [HTTP nativo](https://capacitorjs.com/docs/apis/http), [requisitos Android 8](https://capacitorjs.com/docs/updating/8-0). El número 8 identifica la versión de Capacitor, no la versión mínima del teléfono.
