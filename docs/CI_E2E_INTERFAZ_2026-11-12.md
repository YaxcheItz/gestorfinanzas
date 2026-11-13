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
- Suite completa posterior de125 casos en ejecución al preparar este commit. Se sube para verificar Linux/PostgreSQL en CI en paralelo. El cierre y los SHA/resultados posteriores se registran en el estado/plan del checkout principal y sus planes locales, para no cancelar CI con pushes documentales sucesivos.

La reproducción local usa `FINANZAS_E2E=true`, perfil `test`, H2 exclusivamente en memoria, puertos localhost18080/14200 libres al comenzar y guardas de URL del proyecto. Los flujos API crean solo cuentas y movimientos ficticios en esa base efímera; los demás interceptan la API. No se carga `.env` real ni se usan finanzas/sesiones reales. Logs, trazas y capturas locales en `frontend/.local/ci-repro-before`, `ci-repro-after`, `reportes-ancho-before` y `reportes-ancho-after`. Docker local no tiene daemon disponible; H2 local no acredita PostgreSQL.

## Continuación

Comprobar CI del SHA exacto de esta rama antes de integrar. No integrar PR271 ni publicar/instalar. Android/TalkBack/teclado físico y aceptación visual continúan pendientes; última comprobación anterior sin dispositivo. Se conservan calendario aprobado, historial y lentitud/logout aplazados, chat sin borradores persistentes.

Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/CI_E2E_INTERFAZ_2026-11-12.md. Comprueba el último SHA y su CI en correcciones/ci-e2e-interfaz y el cierre posterior en los planes locales. No confundas H2 local con PostgreSQL remoto, ni QA Chromium con Android/TalkBack».
