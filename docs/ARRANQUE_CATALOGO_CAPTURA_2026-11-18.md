# Consulta de catálogo al renovar la sesión de arranque

18 de noviembre de 2026.

En la CI de `149277c`, los flujos E2E con PostgreSQL aprobaron. La prueba de arranque de la PWA detectó dos consultas sin encabezado de autorización después de un 401 ficticio. Las rutas coincidieron con las consultas de cuentas y categorías que Captura inicia al terminar la lectura local del catálogo. [Trabajo original](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44430937285/job/135247817985).

Se reprodujo la condición con una lectura retenida. Tras invalidar la identidad y completar la lectura, el código anterior inició las consultas. La corrección comprueba la identidad vigente junto con el estado de la lectura antes de cargar, publicar errores o iniciar las consultas remotas. El cambio se limita a la lectura inicial del catálogo de Captura.

La regresión pasó después del cambio. Aprobaron 586 pruebas unitarias, la compilación Angular y TypeScript. `check-startup.cjs` pasó 12 veces con respuestas 200, 401 y 503 ficticias. También aprobaron las cuatro pruebas locales de PWA con H2 en memoria y service worker activo. Se conserva íntegra la comprobación de CI.

La rama se creó desde `develop` `1f0f4ca` comprobado y contiene los cambios de filtros `149277c` y legibilidad `c8f8bc8` de Libro diario. La orden de trabajo autoriza la integración y la publicación web de esta entrega tras las comprobaciones. [Revisión conjunta](https://github.com/YaxcheItz/gestorfinanzas/blob/856d2dff7deb31b9f6dd34a4c0a3f0cff82d17ef/docs/REVISION_CONJUNTA_LIBRO_DIARIO_2026-11-18.md).

Evidencia en `.local/cierre-recorrido-kaptal/`. Calendario conservado. Historial, lentitud y logout siguen aplazados.
