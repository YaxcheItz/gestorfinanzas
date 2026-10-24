# Viabilidad consultada el 22 de octubre de 2026

Preparación técnica, sin nuevas integraciones ni permisos activados. La primera entrega funcional es compartir texto seleccionado; la etapa completa sigue abierta.

## Wallet y Google Pay

La documentación oficial distingue Google Pay, para aceptar pagos en el sitio/app del comercio, y Google Wallet, para crear y gestionar pases. No se encontró en esas APIs un permiso general con el que Kaptal lea compras de otras aplicaciones o todo el historial financiero del propietario. Esta conclusión es una inferencia del alcance documentado, no una afirmación de que ninguna integración especializada de Google pueda acceder a transacciones.

- FAQ oficial: https://developers.google.com/pay/api/android/support/faq
- Flujo Android: https://developers.google.com/pay/api/android/overview
- Wallet: https://developers.google.com/wallet

Las APIs e-Wallets son integraciones de proveedores de pago, con autenticación/asociación y liquidaciones de esa relación. Los recibos de transporte abierto se alimentan de redes/proveedores y se muestran en Wallet; su documentación no ofrece a Kaptal un lector universal de pagos del teléfono. No implementar cobros ni procesamiento de pagos como sustituto de importación financiera.

- https://developers.google.com/pay/e-wallets-v1
- https://developers.google.com/wallet/tickets/open-loop/setup/technical-architecture
- https://developers.google.com/wallet/tickets/open-loop/mobile-features/transaction-receipts

La alternativa actual de Kaptal es texto seleccionado con revisión explícita. Futuro: notificación bancaria consentida, identificada como ese canal y con confirmación financiera posterior. No consultar bases privadas de Wallet ni usar accesibilidad o SMS como atajo para eludir permisos.

## Notificaciones bancarias

NotificationListenerService es viable con concesión explícita en ajustes de Android y selección de aplicaciones. No garantiza disponibilidad en todo perfil/dispositivo. Android 15 restringe contenido de notificaciones donde detecta OTP; no intentar eludirlo. El filtrado propio sigue siendo necesario: permiso revocado, paquete no seleccionado, sesión cerrada, OTP/tarjeta completa, repeticiones y cambios de contenido deben tener pruebas.

- https://developer.android.com/reference/android/service/notification/NotificationListenerService
- https://developer.android.com/about/versions/15/behavior-changes-all#otp-redaction

Diseño mínimo siguiente: permiso desactivado y selección vacía por defecto; filtrar paquete antes de leer contenido; cola privada acotada ligada a cuenta; conservar publicaciones distintas, marcar posibles actualizaciones y no confundirlas con gastos nuevos. Recibir nunca equivale a registrar dinero. La prueba física inicial debe usar un emisor sintético controlado; la prueba bancaria requiere permiso y apps elegidas por el propietario.

## Accesos del sistema

App Shortcuts permite accesos a acciones concretas. Es una implementación Android aparte: no convierte por sí sola los atajos PWA existentes. Validar acceso conservado tras login, reload y proceso muerto; no iniciar micrófono sin gesto del usuario. Revisar versión soportada y launcher Samsung.

- https://developer.android.com/develop/ui/views/launch/shortcuts/creating-shortcuts

Los accesos de cortina se implementan con TileService. Deben añadirse por el usuario; crear el servicio no los coloca automáticamente. Para captura financiera desde un dispositivo bloqueado se debe exigir desbloqueo antes de mostrar datos/actuar. En Android 14+ se usa startActivityAndCollapse con PendingIntent; no la variante antigua con Intent. Mantener etiquetas genéricas, sin saldos o cuentas visibles en la cortina. Aún no implementado en Kaptal.

- https://developer.android.com/develop/ui/views/quicksettings-tiles
- https://developer.android.com/reference/android/service/quicksettings/TileService

Widgets, privacidad/biometría y voz/archivos nativos siguen como trabajo de las etapas correspondientes. No añadir Google Pay comercial, Gmail, Play Store ni conciliación multicanal completa por esta investigación.
