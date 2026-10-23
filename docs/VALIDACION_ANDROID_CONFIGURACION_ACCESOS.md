# Validación física de configuración y accesos Android

## Alcance y base

Rama `validacion/android-configuracion-accesos-fisicos`, creada desde `origin/develop` `0d90675b44e95619260dddfcab6766e911b01fa8` revalidado. Samsung SM-A546E físico. APK debug de accesos instalada en `com.kaptal.app.debug`, más APK de instrumentación; release del propietario no sustituida. Backend Spring/H2 efímero, loopback 18082 y credenciales sintéticas privadas. Sin QA nuevo ni operaciones en producción; Gmail deshabilitado.

## Resultados conservados antes de la interrupción

- Dos pruebas instrumentadas `CaptureWidgetTest` correctas: intents explícitos y distintos sin extras financieros; proveedor solo para pantalla de inicio y sin actualización periódica.
- Configuración interactiva en WebView física: login aislado; activación deshabilitada sin consentimiento/permiso; selección Sears QA, lista y remitente/terminación sintéticos; activación real contra Spring local y configuración nativa cifrada activa; desconexión por UI y DELETE local correcto, estado desactivado y cola vacía. No se enviaron notificaciones bancarias reales. Evidencia `.local/automatico-configuracion-ui.txt`.
- Arranque frío con acción Ingreso sin sesión: intención conservada tras login y formulario de ingreso correcto. App abierta: Gasto, Ingreso y Dictar abren la superficie correcta; cerrar no reabre ni guarda. Dictar no inicia escucha automáticamente. Evidencia `.local/accesos-fisicos-ui.txt`.
- Launcher Samsung real: pulsación prolongada sobre Kaptal Pruebas muestra los tres accesos; Gasto comprobado desde ese menú.
- Widget real añadido desde el selector de Samsung: muestra título y tres botones sin datos financieros; Gasto comprobado tocando el botón físico. Evidencia `.local/capture-launcher-widget.txt`; XML/capturas privados solo en `.local`.

## Incidencias del arnés y recuperación de la interrupción

El primer intento de QA falló porque Capacitor recrea el prototipo de XHR por instancia y anulaba el desvío local de GET. Corregido únicamente en el arnés privado, envolviendo cada instancia y fetch; además se ajustó un selector de label que incluía las opciones del select. Tras ello pasó la configuración. No se modificó código de aplicación por estos problemas del arnés. Este transporte interceptado valida UI y plugins reales con API local, no TLS ni transporte HTTPS de producción.

La interrupción por falta de tokens dejó vencer la espera externa del arnés de accesos y la fixture H2. Maven terminó con `Interactive fixture timed out`; sus aserciones finales de cero conexiones/movimientos no llegaron a ejecutarse. Esto no invalida los pasos UI registrados, pero impide afirmar que el cierre global de la fixture fue satisfactorio. Al retomar no hay proceso backend ni listener 18082; el archivo de credenciales temporal ya no existe. El marcador `capture-native-ready` residual se retira.

Al retomar ADB no detecta el teléfono. Quedan Ingreso y Dictar desde el widget real y los accesos restantes del launcher, recorrido de sesión vencida/logout, giro/letra grande/TalkBack y limpieza final del teléfono (comprobar y retirar widget QA si corresponde, vaciar sesión debug y retirar instrumentación/permiso QA). La revocación del permiso debug se ejecutó en finally en el arnés de configuración y se intentó también en el de accesos; verificar el estado actual al reconectar. No dar por hecha la limpieza física sin conexión.

No repetir configuración, bloqueo/reinicio/deduplicación ni acciones satisfactorias sin cambio o motivo. Levantar otra H2 aislada solo para completar pendientes y cerrar sus verificaciones; no repetir la activación bancaria ya aprobada. Etapa 10 sigue abierta por estos límites, HTTPS público y piloto consentido tras despliegue autorizado. Main/producción requieren aprobación separada.

## Cierre físico al reconectar el teléfono

Se reanudó sin repetir la activación bancaria ni los pasos aprobados. Una H2 nueva, aislada en 18082, se usó solo para los recorridos pendientes. Ingreso y Dictar pasaron tocando los botones reales del widget. Ingreso y Dictar también pasaron desde el menú de accesos del launcher Samsung. Sumados a Gasto aprobado antes, los tres botones y los tres accesos están comprobados físicamente. Dictar abre la superficie de captura sin activar escucha.

También pasó la renovación con vencimiento simulado del access token, conservando la acción Ingreso. Es simulación sobre WebView física con API local, no espera natural del vencimiento ni HTTPS público. Pasó logout real por UI, rechazo de acceso sin sesión con `captura=dictar` conservado, nuevo login y apertura de Dictar sin escucha. No se guardaron movimientos en ningún formulario. Evidencia acumulada `.local/capture-launcher-widget.txt`; transporte local `.local/accesos-cierre-ui.txt`.

Cierre de la nueva fixture: `AndroidConfigurationFixtureTest`, una prueba, cero fallos/errores; las aserciones de cero conexiones Android y cero movimientos del usuario efímero sí se ejecutaron. Registro `.local/configuracion-accesos-cierre-backend.log`. Backend 18082 apagado y archivo de credenciales eliminado automáticamente. El timeout anterior queda documentado como incidencia del arnés interrumpido y no se confunde con este cierre satisfactorio.

Limpieza: logout por UI comprobado; sin token/usuario web, marca NativeSession cerrada/usuario cero y archivo `no_backup/bank-automatic.enc` ausente. No hay permiso de escucha de Kaptal habilitado. APK de instrumentación retirada; debug queda separada y sin sesión. Widget QA retirado desde el launcher y ausencia de cola cifrada comprobada; debug detenida al finalizar. Release del propietario sigue sin sustituirse.

Pendientes reales: revisión manual con TalkBack y combinaciones adicionales de giro/letra grande de los nuevos accesos; HTTPS público y piloto bancario consentido requieren una promoción separadamente autorizada. No cerrar Etapa 10 ni afirmar funcionamiento bancario público a partir de esta prueba. Gmail permanece deshabilitado. Siguiente: revisión manual pendiente o preparación de Etapas 12/13 en otra rama desde develop actualizado; diseño al final.

## Bloqueo de CI y parches de tooling

El primer HEAD documental de #114 (`ea2c94c`) compiló, pero CI 333/40040529000 detectó avisos nuevos de dependencias de desarrollo y no llegó a ejecutar las unitarias frontend. Se preserva ese resultado fallido; no se sortea ni se amplía la excepción de auditoría.

Se actualiza únicamente tooling dentro de las mismas versiones mayores: Angular CLI 21.2.28 y sus DevKit/Schematics, body-parser 2.4.0, fast-uri 3.1.9, undici 6.29.1/7.30.1, zod 4.6.6 y qs 6.16.1 transitivo. Angular Build fija todavía undici vulnerable: override acotado `@angular/build → undici ^7.30.1`; no se fuerza la rama 7 sobre node-gyp que usa la 6. El código de aplicación y las migraciones no cambian. La prueba física anterior corresponde a la APK debug ya identificada; los nuevos builds y CI verifican el ajuste del tooling, sin repetir operaciones físicas satisfactorias.

Referencias verificadas: [undici](https://github.com/advisories/GHSA-4qv8-2p9j-2685), [zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828), [fast-uri](https://github.com/advisories/GHSA-w74x-v6f9-j3xg). Verificar auditoría, build y todos los jobs del HEAD final antes del merge autorizado a develop. Main/producción siguen fuera.
