# Corrección de E2E de interfaz — 12 noviembre 2026

Rama `correcciones/ci-e2e-interfaz`, worktree `.local/worktrees/ci-e2e-interfaz`. Creada desde `origin/develop` comprobado contra remoto (`74a85bb60a7301e38198fa7245d817d57d85f82b`) e incorporada la dependencia `f2b69895cde381da0841990f400f0da5824bd63e` por fast-forward. Skills: debugging-and-error-recovery y ponytail. Sin cambios de cálculos financieros, API, calendario aprobado o historial aplazado.

## Evidencia y causas

Se comprobó el fallo de [CI43317995498](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/43317995498) para el SHA exacto f2b6989. Frontend, Backend, PostgreSQL, WhatsApp y Canales personales aprobaron; E2E falló. El usuario habilitó la sesión de GitHub CLI; se descargaron registro y artefacto de fallos sin leer ni copiar credenciales. El primer intento del artefacto perdió conexión; el reintento completó la descarga. Evidencia privada del checkout principal en `.local/ci-e2e-20261112/`, fuera de Git.

El registro identifica cinco casos fallidos, con cuatro causas/correcciones:

1. `chat-visual-local.spec.ts` agotaba los 30 segundos generales de la suite de CI. Su recorrido tiene numerosas capturas y pausas de estabilización; en el perfil local disponía de 180 segundos, pero el test no declaraba su presupuesto propio. Ahora declara 120 segundos, manteniendo todos sus pasos y aserciones.
2. `contraste-audit-local.spec.ts` tenía el mismo problema: recorre 28 combinaciones de sección/tema/formulario, con pausas de color y capturas. Declara 120 segundos en el propio test; no se eleva el timeout global ni se relajan comprobaciones de foco/contraste. La especificación oficial admite [timeout por test](https://playwright.dev/docs/test-timeouts#test-timeout).
3. `periodos-flexibles.spec.ts` buscaba el rango por posición (`.reports-comparison.first()`), que ahora corresponde al texto accesible del mes. Se selecciona explícitamente el párrafo que comienza por «Del» y se exige el rango completo `2025-12-20 al 2026-01-19`. No se cambia la consulta ni su cálculo.
4. Dos casos de Reportes (`estados-local` y `poblados-local`) detectaban ancho de documento324 frente a viewport320 en Linux. El JSON del artefacto identifica el botón/host de privacidad con borde derecho324,30. La cabecera no permitía envolver el título ampliado y el botón. Se añade únicamente `flex-wrap:wrap` a `.reports-heading`.

La regresión nueva `reportes-ancho-local.spec.ts` usa sesión/API ficticias, ancho320 y raíz200%, fuentes Arial/Verdana/Tahoma y ambos temas. Antes del ajuste reprodujo anchuras324/365/335 según fuente/tema; después, los seis casos dan320. Se conservan título, botón, valores completos del mes y scroll interno de la tabla; no se esconde el overflow del documento.

## Validación durante la preparación del commit

- Compilación backend/test-compile aprobada:234 clases principales y81 de pruebas, JDK23 con release21. CI usa JDK21; son entornos distintos.
- Build frontend aprobado; avisos CSS previos de Avisos4,49 kB y automatic-bank5,01 kB conservados.
- TypeScript estricto del E2E nuevo y `git diff --check` aprobados.
- Primera reproducción con la configuración general, H2 en memoria y backend local:79 aprobados y3 fallos antes del corte por `--max-failures=3`, coincidentes con los dos timeouts y el selector del rango.42 casos no ejecutados por ese corte; no equivale a la suite completa aprobada.
- Prueba de ancho nueva: falló antes y aprobó después con seis combinaciones de fuente/tema.
- Suite completa posterior local con H2:121 aprobados y4 omitidos condicionales de PWA (14,5 minutos). Los cuatro de PWA requieren su configuración específica; no se contabilizan como aprobados en esta ejecución general.

La reproducción local usa `FINANZAS_E2E=true`, perfil `test`, H2 exclusivamente en memoria, puertos localhost18080/14200 libres al comenzar y guardas de URL del proyecto. Los flujos API crean solo cuentas y movimientos ficticios en esa base efímera; los demás interceptan la API. No se carga `.env` real ni se usan finanzas/sesiones reales. Logs, trazas y capturas locales en `frontend/.local/ci-repro-before`, `ci-repro-after`, `reportes-ancho-before` y `reportes-ancho-after`. Docker local no tiene daemon disponible; H2 local no acredita PostgreSQL.

## Comprobación remota y bloqueo adicional de dependencias

El commit `50387505f0c2603493cb71fe1eb9ff9b522cc463` se subió y comprobó por SHA remoto. Su [CI43343632611](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/43343632611) terminó con cinco trabajos aprobados y Frontend fallido exclusivamente en la auditoría de dependencias. E2E Chromium/API/PostgreSQL aprobó121 casos, omitió los cuatro PWA condicionales y después aprobó esos cuatro en la configuración de producción con service worker real. También aprobaron la medición de navegación sintética, Backend, PostgreSQL/recuperación, WhatsApp y Canales. Esto confirma resueltos los cinco fallos E2E originales; no se presenta esa ejecución global como verde.

La auditoría encontró avisos nuevos en dos dependencias transitivas de desarrollo del SDK MCP usado por Angular CLI: `hono`4.13.13 y `@hono/node-server`2.1.4. Se actualiza únicamente su resolución en `package-lock.json` a4.13.18 y2.1.8, compatibles con los rangos del padre. Referencias oficiales de las versiones: [hono4.13.18](https://github.com/honojs/hono/releases/tag/v4.13.18) y [node-server2.1.8](https://github.com/honojs/node-server/releases/tag/v2.1.8). No se modifica `package.json`, el verificador ni sus excepciones.

Instalación limpia aislada en este worktree mediante `npm ci`, sin modificar los módulos compartidos del checkout principal. Tras actualizar: `npm run security:check` aprobado (4 pruebas del verificador; producción y desarrollo sin vulnerabilidades conocidas en la auditoría actual), build aprobado con los dos avisos CSS anteriores,571 unitarias/65 archivos aprobados y regresión de ancho aprobada otra vez (1 test, seis combinaciones). El último cambio de código de aplicación sigue siendo la cabecera de Reportes.

Se prepara el push final para verificar los seis trabajos sobre su SHA exacto. El cierre y los SHA/resultados posteriores se registran en el estado/plan del checkout principal y sus planes locales, para no cancelar CI con pushes documentales sucesivos.

## Continuación

Comprobar CI del SHA exacto de esta rama antes de integrar. No integrar PR271 ni publicar/instalar. Android/TalkBack/teclado físico y aceptación visual continúan pendientes; última comprobación anterior sin dispositivo. Se conservan calendario aprobado, historial y lentitud/logout aplazados, chat sin borradores persistentes.

Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/CI_E2E_INTERFAZ_2026-11-12.md. Comprueba el último SHA y su CI en correcciones/ci-e2e-interfaz y el cierre posterior en los planes locales. No confundas H2 local con PostgreSQL remoto, ni QA Chromium con Android/TalkBack».

## Cierre CI comprobado — 12 noviembre 2026

Código final e24dd9ec81eaae66e9f79e004e233f597fb8f150 en correcciones/ci-e2e-interfaz: push y SHA remoto verificados. CI43346094993 terminó Success (14m1s), seis trabajos aprobados: Frontend, Backend, PostgreSQL/migraciones/regresiones/recuperación, WhatsApp, Canales personales y E2E Chromium/API/PostgreSQL (13m58s). Evidencia pública: https://github.com/YaxcheItz/gestorfinanzas/actions/runs/43346094993 y https://github.com/YaxcheItz/gestorfinanzas/actions/runs/43346094993/job/131625706852 . Consulta API autenticada había confirmado los otros cinco trabajos y el recorrido API; tras timeouts TCP locales de GitHub:443, se verificó el estado final por lectura web pública. El error de gh run watch fue de conectividad, no una conclusión fallida de CI. No se modificaron DNS, credenciales ni configuración de red.

Validación local final: build y571 unitarias/65 archivos,4 tests del verificador de dependencias, auditoría frontend sin vulnerabilidades conocidas en producción/desarrollo, TypeScript estricto y diff check aprobados; regresión nueva de Reportes comprobada antes/después y repetida tras actualizar dependencias. Suite general H2:121 aprobados/4 PWA omitidos condicionales. Los conteos remotos121 generales+4 PWA se obtuvieron del registro de la ejecución anterior5038750; la ejecución finale24dd9e se acredita aquí por conclusión exitosa de los seis trabajos, sin atribuirle conteos no descargados todavía. Avisos CSS preexistentes conservados. ADB desde SDK estándar comprobado de nuevo: ningún dispositivo conectado.

Siguiente: aceptación visual y QA Android/TalkBack/teclado físico con dispositivo y perfil/datos ficticios aislados. Antes de cualquier integración, revisar dependencias de ramas y exclusión de PR271; sin integración, despliegue ni instalación realizados en esta etapa. Calendario aprobado; historial y lentitud/logout aplazados; chat sin borradores persistentes.

Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md, docs/CI_E2E_INTERFAZ_2026-11-12.md y los planes locales. La rama correcciones/ci-e2e-interfaz termina en e24dd9ec81eaae66e9f79e004e233f597fb8f150 con CI43346094993 verde, seis trabajos aprobados. Sigue con aceptación visual y Android/TalkBack/teclado físico aislados cuando haya dispositivo; conserva calendario e historial aplazado y excluye PR271. Comprueba remoto y estado antes de abrir otra etapa».