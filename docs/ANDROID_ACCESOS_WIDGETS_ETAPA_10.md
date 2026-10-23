# Etapa 10: accesos y widget de captura Android

Rama `mejoras/android-accesos-widget-captura`, nueva desde `origin/develop` comprobado `f0ca6047ae10719133034790f6474268be6c4fcf`. #110/#111 integrados, verificados en GitHub. Sin cambios en main ni despliegue.

## Uso y alcance

Al abrir la app se publican tres accesos dinámicos del launcher: Gasto, Ingreso y Dictar (Android 7.1 o superior). Mantener pulsado el icono permite acceder a ellos en launchers compatibles. Desde el selector de widgets se puede añadir «Kaptal · Captura», con las mismas tres acciones. El widget está declarado solo para pantalla de inicio, sin actualizaciones periódicas ni contenido financiero. No solicita permisos nuevos.

`CaptureWidget` crea intents explícitos a MainActivity y PendingIntents inmutables diferenciados por acción. `CaptureActionPlugin` conserva solo una acción pendiente en memoria, la consume una vez y no acepta destinos externos. Se reutilizan `accion-captura.ts`, `/dashboard?accion=...`, su guard, login y captura existentes. Angular espera la navegación inicial antes de consumir el arranque frío. Una acción nueva reemplaza otra aún pendiente; no hay cola de órdenes financieras. Tocar un acceso abre un formulario, nunca registra dinero. Dictar abre la captura existente sin iniciar escucha automáticamente.

El widget no lee autenticación, claves, cuentas, saldos, movimientos ni preferencias privadas. No permite operar encima del bloqueo. La sesión sigue controlada por el guard y la marca nativa de logout existente. No hay backend ni migraciones nuevos para los accesos.

## Pruebas y límites

En curso: build web, pruebas focalizadas de puente/guard/login, JVM, lint y builds debug/instrumentación. El cierre de CI del HEAD exacto debe consultarse antes del merge. No se instalará una APK sobre la app del propietario sin teléfono disponible. El número de versión se conserva en 0.1.5; esta entrega no constituye una nueva release instalada.

`CaptureWidgetTest` comprueba intents explícitos, separación de PendingIntents y metadatos del proveedor; compilada no equivale a ejecutada. Con el teléfono desconectado quedan pendientes launcher/widget reales, toques con app abierta y cerrada, logout/login con intención conservada, sesión vencida, bloqueo, giro, letra grande y TalkBack. Verificar que gasto/ingreso abre el tipo correcto, que volver atrás no reabre la acción y que dictar no activa escucha sin gesto explícito. No repetir pruebas del almacén bancario que ya pasaron si no cambia ese código.

Las pruebas no publicadas de la rama anterior fueron revisadas y conservadas: `AndroidConfigurationFixtureTest` solo se activa con `-Dkaptal.device.configuration=true`, H2 efímera y loopback 18082, sin datasource de producción; `AutomaticBankLifecycleTest` requiere fase explícita, app debug y archivo cifrado de QA separado. Sus cuatro fases seed/locked/rebooted/cleanup ya pasaron según registros locales. Al retomar no había fixture activa ni puertos 18081/18082 escuchando; se retiró el archivo temporal de credenciales residual. Configuración interactiva sigue pendiente; no se presenta como prueba realizada.

Etapa 10 abierta: configuración interactiva, estos recorridos físicos, HTTPS público tras despliegue autorizado y piloto con formatos reales consentidos. Gmail deshabilitado. No recrear usuarios QA ni usar dinero real. Merge a develop autorizado tras comprobaciones; main/producción requieren aprobación separada. Después Etapas 12/13 y diseño al final.

Referencias oficiales: [accesos Android](https://developer.android.com/develop/ui/views/launch/shortcuts/creating-shortcuts), [widgets con Views](https://developer.android.com/develop/ui/views/appwidgets). Se emplean APIs ya disponibles en la plataforma, sin nuevas dependencias.
