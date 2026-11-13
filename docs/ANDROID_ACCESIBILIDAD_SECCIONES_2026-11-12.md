# Accesibilidad en WebView Android — 12 noviembre 2026

## Base y aislamiento

Rama `validacion/android-accesibilidad-secciones`, creada desde `origin/develop` remoto comprobado `74a85bb60a7301e38198fa7245d817d57d85f82b`, incorporando por fast-forward `e24dd9ec81eaae66e9f79e004e233f597fb8f150` de `correcciones/ci-e2e-interfaz`. Este código tiene CI43346094993 con seis trabajos aprobados; no es una ejecución de las pruebas físicas descritas aquí. Worktree `.local/worktrees/android-accesibilidad`. Skills: ui-ux-pro-max para accesibilidad y playwright-cli para el recorrido con Playwright, más ADB para eventos y capturas nativas. No se modifica código de aplicación en esta parte.

Samsung SM-A546E conectado, Android16, WebView Chrome157.0.8103.50. Se compiló una APK debug separada `com.kaptal.app.qa.a11y`, nombre «Kaptal QA Accesibilidad», versión0.1.44-pruebas/código45. SHA256 `53344f678e3b9bf85e7e75c9674822b14ec5b2e6357d517f21cce58dc5da5fea`. La app habitual `com.kaptal.app` permanece en0.1.44/código45; versión y fechas de instalación/actualización coinciden antes y después. No se abrió su interfaz ni se leyeron sesiones o finanzas del propietario.

La preparación se limita a archivos generados/ignorados: APK debug con sufijo de identidad distinto; recursos del build web con destino API sustituido por `https://kaptal-qa.invalid`, HTTP nativo deshabilitado y política de contenido que bloquea otros destinos. El arranque de Angular requiere una bandera del arnés; antes se conecta la intercepción y la sesión ficticia. Se reutiliza `e2e/secciones-fixture.ts` para contratos locales, bloqueando las escrituras y la red externa. No hay backend productivo, usuarios QA en producción, login real ni servidor remoto de desarrollo. Los cambios automáticos de rutas Gradle producidos por `cap sync` se restauraron; no se publican rutas locales en el código.

## Resultados físicos comprobados

- Build web aprobado y APK debug compilada:124 tareas Gradle. Son construcción e instalación de QA, no actualización distribuible ni nueva entrega firmada de producción.
- Matriz DOM en WebView física:44 combinaciones (11 secciones × claro/oscuro × raíz100/200%). Inicio, Cuentas, Presupuestos, Categorías, Etiquetas, Reportes, Metas, Libro diario, Pareja, Avisos y Configuración. Ancho efectivo384 CSS px, documento384 en las44 combinaciones. Se probaron estados ficticios poblados y vacíos según el contrato; Categorías/Presupuestos no se presentan como pruebas de listas pobladas.
- Eventos reales de la entrada Android, enviados con ADB y con comprobación previa de que QA está al frente: Enter abre «Nueva categoría»; doce Tab mantienen foco en el diálogo; Escape lo cierra y devuelve foco al botón inicial. Una prueba física automatizada pasó en59,9s. Son eventos inyectados, no un teclado físico conectado.
- Doce capturas nativas ADB para Cuentas/Reportes/Configuración, ambos temas y raíz100/200%. En este dispositivo el valor calculado pasa de17,6px a35,2px. Se usa la pantalla real, no la captura CDP, para inspección visual.
- Árbol AX de la WebView: diálogo «Nueva categoría», botón «Cerrar», campo «Nombre», selector «Tipo», botones «Color #…» y estado pressed verdadero/falso presentes. Esto acredita semántica expuesta; no acredita pronunciación, orden percibido ni experiencia auditiva con TalkBack.

## Incidencias del arnés y límites

El primer recorrido completó las44 medidas, pero se detuvo antes de enviar teclas: buscaba `mResumedActivity` y este Samsung informa `topResumedActivity`. Se corrigió el guardia del arnés y se repitió la prueba, que aprobó. No fue un defecto de la aplicación.

Las capturas CDP/Playwright de esta WebView distorsionan el micrófono y, con fullPage, repiten regiones. El rectángulo DOM del botón es64×64 y una captura ADB confirma el círculo correcto. Se conservan las capturas CDP como evidencia de la incidencia, sin usarlas para diagnosticar ni rediseñar la interfaz. La automatización Android de Playwright tiene [limitaciones documentadas](https://playwright.dev/docs/api/class-android); su [página de WebView](https://playwright.dev/docs/api/class-androidwebview) describe la conexión al render real, no garantiza fidelidad de toda captura.

El primer intento de cambiar temporalmente `font_scale` a2.0 y `user_rotation` a1 no modificó las dimensiones efectivas ni el tamaño calculado de la WebView abierta. Las dos capturas de esa primera fase así nombradas no acreditan texto del sistema grande ni orientación horizontal. Se repitió después recreando únicamente la actividad QA y controlando el giro con `wm user-rotation`: texto del sistema2.0 produjo raíz32px en Cuentas y documento384/viewport384; horizontal efectivo en Reportes produjo832×384 y documento832. Las aserciones aprobaron y las capturas nativas confirman ambos cambios. Esta repetición pasó en7,1s; no se extrapola a todas las secciones o a otros dispositivos.

No se abrió el calendario aprobado ni se rediseñó el historial. Tampoco se probaron transporte HTTP nativo productivo, sincronización real, banco/notificaciones, escucha de micrófono, finanzas, teclado físico ni otros modelos/WebViews. No se infiere cumplimiento completo WCAG a partir de estas medidas.

## Prueba manual y continuidad

Se dejó inicialmente el diálogo de Categorías abierto en QA para una comprobación manual de TalkBack. Tras aclarar que se activa en los Ajustes del celular, el propietario indicó: «Quiero que olvides talkback realmente no lo usaré puedes dejarlo hasta lo ultimo ultimo». TalkBack queda expresamente aplazado hasta la última fase, no bloquea el trabajo visual ni la preparación de entrega y no debe volver a pedirse ahora. No se declara aprobado ni se eliminan las mejoras de semántica accesible. Al cerrar, accesibilidad global reporta0, sin lector activo. Aceptación visual del propietario y teclado físico siguen sin acreditarse por esta prueba automatizada.

Evidencia privada, fuera de Git, en `frontend/.local/` de este worktree: `android-a11y-results`, `android-a11y-after`, `android-a11y-native`, `android-a11y-dynamic`, APK en `android/app/build/outputs/apk/debug/` y preparación/arnés/registros locales. El APK queda archivado localmente como artefacto de QA, sin distribuir.

## Cierre comprobado

Las ejecuciones focales de matriz/teclado, capturas nativas y texto/giro efectivo aprobaron. En las dos últimas, los registros del arnés confirman cero escrituras, cero errores JavaScript y cero peticiones a orígenes externos no previstos. La ejecución de capturas dura8,4min porque incluye espera manual; ese tiempo no mide rendimiento de la app. No se repiten unitarias/CI generales al no cambiar código de aplicación, dependencias ni tests versionados.

Se detuvo y desinstaló exclusivamente `com.kaptal.app.qa.a11y` del usuario0, comprobando ausencia posterior. Se retiró únicamente el forward ADB19322 y se comprobó su ausencia. Ajustes finales verificados: font_scale1.1, autorrotación0, user_rotation0 y WindowManager `lock 0`. Fue necesario reafirmar el bloqueo de WindowManager después de las escrituras de Settings para evitar una actualización asincrónica al valor anterior. Versión/código/fechas de la app habitual idénticos antes/después; no se cambió su instalación ni se abrió su sesión. Micrófono/notificaciones de QA no se concedieron. Sin integración, despliegue ni actualización distribuible.

Siguiente: aceptación visual por secciones y preparación de la entrega Android con las mejoras acumuladas. Antes de una APK distribuible, comprobar rama/dependencias, excluir PR271 y verificar CI exacta, versión, firma/contenido/hash. Publicar/instalar release es una etapa posterior. TalkBack queda para lo último por decisión explícita del propietario.

Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/ANDROID_ACCESIBILIDAD_SECCIONES_2026-11-12.md, además de los planes locales. Revalida Git y prepara la siguiente entrega Android con las mejoras visuales acumuladas, manteniendo las comprobaciones de CI y artefacto antes de distribuir. La QA física sintética de esta parte aprobó; TalkBack fue aplazado explícitamente hasta lo último. Conserva datos reales, calendario aprobado, historial y lentitud/logout aplazados, chat sin borradores y exclusión de PR271».

Verificación adicional: SHA256 de la APK instalada coincidió con el archivo construido (53344f678e3b9bf85e7e75c9674822b14ec5b2e6357d517f21cce58dc5da5fea) antes de retirar la QA. El propietario pidió después aplazar TalkBack, como se registra arriba; ya no se espera respuesta sobre anuncios para cerrar esta parte.
