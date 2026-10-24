# Validación Android en Samsung

## Resultado del 22 de octubre de 2026

Rama `validacion/android-fisico-0-1-1`, desde `origin/develop c46d090`. PR [#104](https://github.com/YaxcheItz/gestorfinanzas/pull/104), sin integrar. #102 y #103 ya integrados en develop; main permanece `d39d899`. Sin despliegue nuevo. Pruebas autorizadas por el propietario, sin modificar sus movimientos reales.

## Instalación release

Samsung SM-A546E, Android 16. Actualizaciones firmadas 0.1.0 → 0.1.1 → 0.1.2, sin desinstalar ni borrar datos. La 0.1.1 abrió la sesión previa del propietario. La actualización final 0.1.2 confirmó Success, código 3, lastUpdateTime 2026-10-22 17:52:29 y firstInstallTime original 2026-10-22 00:26:31. Arranque frío final confirmado por Android.

- APK: `.local/releases/Kaptal-0.1.2.apk`; alias `.local/releases/kaptal-release.apk` actualizado. Versiones anteriores conservadas.
- Copia en el teléfono: Descargas/Kaptal-0.1.2.apk.
- Tamaño: 3 489 296 bytes.
- SHA-256: `C85606A34710E1D8C2ECC04D257FA17A82C38490759BF6A70D80C99286D549D4`.
- Certificado SHA-256 conservado: `b5f360604095a50f3208299767dcedca2f3acfc5087df8be1fde9cc075c120c3`.

## Pruebas financieras en el teléfono físico

Instalada «Kaptal Pruebas», `com.kaptal.app.debug`, con almacenamiento separado de release e inspección WebView solo en compilaciones depurables. Playwright conectado a la WebView del Samsung real, plataforma android, origen local https://localhost y transporte HTTP nativo a la API de producción. No fue emulación ni PWA. Cuenta exclusivamente sintética; credenciales y capturas privadas en .local, fuera de Git.

| Recorrido | Resultado |
|---|---|
| Arranque instrumentado | Formulario local, Android, health HTTPS y ausencia de GIS web: 1 prueba correcta. |
| Registro, logout y login | UI real, identidad QA y consulta autenticada 200. |
| Renovación natural | Tras pausa superior a tres horas, acceso vencido; reanudación sin login, token renovado y consulta 200. Sin alterar reloj ni tokens. |
| Cuentas | Banco QA inicial 1000 y Reserva QA inicial 0, desde UI. |
| Movimientos | Gasto 25.50, ingreso 100, transferencia 50; saldos 1024.50 / 50, un registro de cada operación en historial. |
| Edición | Gasto a 30.50 desde UI; saldo banco 1019.50. |
| Eliminación | Confirmada en UI; gasto ausente, saldos 1050 / 50. |
| Offline real | Wi-Fi y datos móviles apagados desde Android; USB activo. Gasto 12.34 guardado desde UI en IndexedDB. |
| Muerte del proceso | Force-stop solo de app QA; reapertura sin red conserva sesión y el mismo pendiente. |
| Sincronización | Red restaurada; cola vacía, exactamente un gasto 12.34 en servidor, saldo 1037.66 / 50; recarga sin duplicados. |
| Giro y letra grande | Giro conserva importe sin guardar; escala del sistema 1.3 también tras corrección. Sin desbordamiento horizontal en formulario probado; ajustes restaurados. |
| Teclado | Toque nativo abre teclado real, confirmado por InputMethod; Atrás lo oculta conservando importe. Guardar visible sobre teclado. Cierre sin guardar. |
| Segundo plano | Home y retorno a QA con consulta autenticada y saldo correcto. |
| Asistente y evidencia | Consulta mensual: ingresos 100.00, gastos 12.34 y balance 87.66. Su evidencia abre historial con un gasto 12.34 y filtros de fecha/moneda correctos. CSV obtenido por HTTP nativo con esos filtros: cabecera y exactamente esa fila. No certifica guardar/compartir el archivo en Android. |

Los importes son sintéticos. La cuenta QA se conserva para continuar pruebas. No se cerró la sesión del propietario. Estas pruebas financieras se ejecutaron en debug física; la actualización y firma se verificaron en release. No certifican todas las pantallas, el trabajo con pantalla bloqueada ni sincronización automática con la app cerrada.

## Fallos corregidos y comprobaciones

1. Offline nativo: faltaba ACCESS_NETWORK_STATE; navigator.onLine seguía true con Wi-Fi y datos apagados e impedía ofrecer guardado offline. Añadido el permiso normal de estado de red y repetido el recorrido completo correctamente. Prueba instrumentada de permiso efectivo: 1 correcta en Samsung. [Referencia Android](https://developer.android.com/reference/android/Manifest.permission#ACCESS_NETWORK_STATE).
2. Letra grande: cambiar escala reiniciaba la actividad y borraba importe sin guardar. Añadido fontScale a configChanges; repetido el cambio real conservando captura. [Referencia Android](https://developer.android.com/guide/topics/manifest/activity-element#config).
3. CI: aviso nuevo en ip-address 10.7.2, dependencia de desarrollo. Lockfile actualizado únicamente a 10.7.4; auditoría vuelve a pasar, sin ampliar excepciones. [Aviso y parche](https://github.com/advisories/GHSA-rxp7-6hxx-x8q5).

Conexión: instalado controlador oficial Samsung 1.9.5.0, firma válida, interfaz ADB 2.21.4.0. Al retomar, un servidor ADB aislado de nuestras pruebas en 5038 interfería con USB. Cerrado; un único servidor 5037 permitió completar las pruebas. No atribuir el problema a otras aplicaciones ni guardar códigos temporales de vinculación.

Validación local final: frontend **383 pruebas correctas**, build web correcto, auditoría correcta (producción sin avisos; cadena de desarrollo braces conocida pendiente), builds debug/release/androidTest correctos y firma release verificada. El CI anterior 0edb2d2 falló por auditoría ip-address, corregida. Código final 81f86d7: CI 291/39875106382 y Android 11/39875106308 **correctos**, incluidos PostgreSQL, recuperación, E2E y PWA. Los commits posteriores añaden evidencia documental, sin cambiar el código de aplicación. Consultar también checks del head documental antes de integrar #104.

## Pendientes y continuidad

Pantalla bloqueada/reinicio completo, sesiones prolongadas adicionales y ausencia de cookie válida, TalkBack/contraste y revisión de todas las pantallas, voz, CSV/respaldo nativos, Google nativo y privacidad. No confundir captura recuperada tras force-stop con sincronización en segundo plano garantizada.

Durante comprobaciones adicionales se observó una salida aislada al login por sesión expirada. Tras iniciar sesión de nuevo se comprobó renovación 200 antes y después de force-stop; no se reprodujo. No se atribuye una causa sin evidencia y se conserva como pendiente de sesiones prolongadas. La renovación natural correcta descrita arriba no certifica todos los cierres de proceso/actualizaciones posibles.

La APK incluye UI de Etapa 11; su backend no se desplegó en esta tarea y sus endpoints nuevos no se certificaron en producción. Widgets, cortina y notificaciones nativas siguen pendientes.

Siguiente: revisar #104 e integrarlo solo con autorización explícita. Etapa 10 sin Gmail en rama nueva desde develop actualizado: compartir aviso/SMS seleccionado, notificaciones bancarias consentidas con selección de apps y deduplicación, estudio Wallet/accesos. Sin lectura automática de SMS ni acceso universal a pagos Wallet. Después Etapas 12, 13 y revisión final. Gmail deshabilitado y Etapa 6 omitida.

Preparación técnica local, sin implementación nueva: .local/ETAPA_10_PREPARACION.md, con referencias oficiales y puntos de reutilización de la bandeja Avisos existente.

Skills: Ponytail, Mobile Native, Debugging and Error Recovery, Playwright CLI, Security Review, Verification Loop y Documentation and ADRs.
