# CI y revisión de PR285 — 15 noviembre 2026

## Resultado y SHA

PR285 continúa abierto y en borrador: https://github.com/YaxcheItz/gestorfinanzas/pull/285 . Head `b23f38a0c807f07b626d97fb0c4ad9142cee2275`, idéntico al checkout y al remoto consultados. CI comprobada en 2026-11-15 22:56:54 UTC:

- [General43770582994](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/43770582994): completed/success; los seis jobs aprobaron.
- [Android43770582797](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/43770582797): completed/success. Es compilación CI, sin instalación o prueba en un teléfono.

Resumen del log del job E2E132985451459:

- 2026-11-15T22:54:16.8862951Z   4 skipped
- 2026-11-15T22:54:16.8863737Z   166 passed (12.3m)
- 2026-11-15T22:54:47.2521821Z   4 passed (18.2s)

Los casos reservados al proyecto PWA se distinguen de la ejecución PWA dedicada; no se cuentan las omisiones como aprobados. El comprobador de arranque y los pasos de navegación sintética se conservan. Estos resultados pertenecen a b23f38a, sin trasladar la CI de PR284 ni del commit anterior de código.

## Comparativa y comprobación focal

http://127.0.0.1:14372 responde HTTP200. Carga nueva de las288 imágenes,24 vistas/seis modos, selectores independientes y ancho390px comprobados; cero errores JS. Inspección visual directa de12 PNG de detalle, Presupuestos, captura manual, chat e historial: el importe permanece completo y el pie del presupuesto separado en la muestra. No significa inspección individual de las288 imágenes ni aprobación estética del propietario.14368 conservada.

Comprobación adicional de la zona desplazable del detalle en seis combinaciones:390/100%,1280/100% y320/200%, en claro/oscuro. El cierre responde al hit-test del navegador antes y después de desplazar; Escape cierra el diálogo en las seis. El encabezado mantiene su posición sticky en las mediciones. Esto evita convertir el aspecto de una captura parcial en un defecto sin reproducir. Cero escrituras y errores JS; API ficticia, contextos nuevos y red externa/SW bloqueados. No se usa una sesión habitual o datos reales.

No se repiten las580 unitarias/66 archivos,29 E2E de corrección/regresión ni la auditoría144 estados de la etapa anterior. Sus resultados siguen documentados en docs/CORRECCION_DETALLE_IMPORTE_2026-11-15.md. La comprobación nueva tiene un caso Playwright que recorre seis combinaciones; no se suman a las29 como si fueran casos distintos de aquella batería.

Evidencia privada: .local/revision-pr285-ci-comparativa14372/ci-final.json y frontend/.local/review285-scroll dentro del worktree detalle-importe-ampliado. Reproducción focal: `npx --no-install playwright test -c .local/review285.config.ts --output .local/review285-scroll`, desde ese frontend. El comprobador de galería se conserva en frontend/.local/check-gallery.cjs. Las métricas anteriores de contraste/desborde no se ejecutaron otra vez en esta revisión.

## Publicación documental y siguiente paso

Rama nueva revision/pr285-ci-comparativa14372 desde origin/develop fe13575 actualizado y comprobado, adelantada por fast-forward a PR285 únicamente en esta rama. Solo se publican documentos para conservar el head y la CI aprobada de PR285. Developfe13575, main1fd9402 y PR284/3f4d720 no se integran ni modifican. PR271 continúa excluido. Sin instalación o despliegue manual; no se altera hosting.

Revisión técnica de esta etapa terminada dentro del alcance comprobado. Pendiente valoración visual del propietario y sus ajustes por sección; la pregunta sobre conservar el diseño no autoriza integraciones/despliegues. No se inventan otras mejoras para abrir una nueva etapa. Lentitud/logout continúan aplazados.

Para otro chat: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md, docs/CORRECCION_DETALLE_IMPORTE_2026-11-15.md y docs/CI_REVISION_PR285_2026-11-15.md. Continúa PR285/b23f38a desde la revisión documental revision/pr285-ci-comparativa14372: la CI ya aprobó; recoge la valoración visual de comparativa14372 y atiende ajustes concretos con datos ficticios. No integres PR271 ni despliegues manualmente.».
