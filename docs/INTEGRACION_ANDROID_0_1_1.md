# Integración y APK Android 0.1.1

## Alcance autorizado

El 22 de octubre de 2026 el propietario autorizó integrar las entregas y preparar todo lo posible sin teléfono. Incluye #102 a develop, actualización de #103, pruebas del conjunto y APK release firmada. No incluye despliegue de producción, merge a main ni movimientos financieros reales.

PR #102 integrado mediante `c8651d03de549b4f31a6c876dc825cf1d8f27edb`. La rama `mejoras/android-apk` incorpora ese develop mediante `167f0da0d4742aaf1888485e32b05ee7856bdc09`. Se resolvieron cinco conflictos exclusivamente documentales conservando los históricos de ambas entregas; el código y las dependencias combinaron sin conflictos de texto. La versión pasa de 0.1.0/código 1 a 0.1.1/código 2.

Los archivos de compilación Android vuelven a estar ignorados mediante el `.gitignore` de la rama Android. No se borraron artefactos, firma ni datos. La APK anterior se conserva en `.local/releases/Kaptal-0.1.0.apk`.

## Comprobaciones

Código de aplicación comprobado: `167f0da0d4742aaf1888485e32b05ee7856bdc09`. La documentación de cierre posterior no cambia la aplicación empaquetada.

- Backend local: 509 ejecutadas, 503 correctas y 6 omitidas; sin fallos/errores, `mvnw verify` correcto.
- Frontend local: 383 pruebas correctas en 45 archivos; build de producción correcto.
- Dependencias: cuatro pruebas del comprobador correctas; sin vulnerabilidades conocidas de producción y cinco avisos conocidos de desarrollo sin parche. No se ampliaron excepciones.
- [CI 284](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/39825842507): seis jobs correctos, incluidos PostgreSQL/migraciones/recuperación, E2E con API/PostgreSQL y PWA con service worker real.
- [Android 6](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/39825842562): correcto, compila APK debug e instrumentación; no ejecuta pruebas físicas.
- APK release local: compilación y firma correctas, paquete `com.kaptal.app`, versión 0.1.1/código 2. Los 83 archivos web empaquetados coinciden byte por byte con el build actual.

Archivo preparado: `.local/releases/Kaptal-0.1.1.apk`, también en `.local/releases/kaptal-release.apk`; 3,488,964 bytes. SHA-256 `BCE4340FDA3DE29F71D0EC7BF0A152751C4A523B5AE6E0A9BF6561A53DCD51AB`. Certificado SHA-256 `b5f360604095a50f3208299767dcedca2f3acfc5087df8be1fde9cc075c120c3`, idéntico al de 0.1.0. La compatibilidad de identidad y versión permite preparar la actualización, pero conservar sesión/borradores solo se certifica al instalar y probar físicamente.

No se instaló ni copió al teléfono. Metadatos locales en `.local/releases/Kaptal-0.1.1-verificacion.json`. La rama de revisión anterior `revision/integracion-102-103` y su commit `52de452` se conservan; su parche de simulación queda superado por la resolución real de esta entrega.

La APK usa la API HTTPS de producción. Empaquetar las pantallas nuevas no publica sus endpoints: metas y demás funciones nuevas requieren desplegar el backend correspondiente en una entrega coordinada, todavía no autorizada. Las pruebas automáticas de integración usan usuarios sintéticos y servicios locales o de CI.

## Prueba física pendiente

Usar una cuenta de prueba autorizada. Registrar evidencias sin contraseñas, tokens ni información financiera privada.

| Recorrido | Comprobación requerida |
| --- | --- |
| Actualización | Instalar 0.1.1 sobre 0.1.0 sin desinstalar; comprobar versión y conservación de preferencias/borradores. |
| Sesión | Login por correo/contraseña, cerrar/reabrir, fondo y bloqueo, renovación y cierre de sesión. |
| Operaciones | Crear, editar y eliminar movimientos sintéticos; contrastar saldo, historial y reportes. |
| Offline | Capturar sin red, cerrar proceso, reabrir y recuperar conexión; comprobar un único registro y saldo. |
| Interfaz | Teclado, Atrás, giro, zonas seguras y texto grande sin perder botones ni importes. |
| Funciones nuevas | Metas, divisas y listas cuando el backend correspondiente esté disponible; un error por backend anterior no certifica fallo nativo. |

Estas pruebas no se sustituyen por Chromium, emulación, compilación de instrumentación ni health público. Google nativo, voz, archivos/compartición, widgets, accesos de cortina y notificaciones nativas no se declaran completados.

## Orden siguiente

Validación física de sesión/operaciones/offline → Etapa 10 sin Gmail → Etapa 12 → Etapa 13 → revisión final. Gmail sigue deshabilitado; Etapa 6 omitida. La Etapa 9 sigue provisionalmente completa con pendientes físicos. Cada etapa nueva debe usar una rama nueva desde develop actualizado.
