# Publicación web de Libro diario y revisión conjunta

18 de noviembre de 2026.

Tras la autorización para completar la secuencia, `develop` avanzó a `5503c57` y `main` a `81acd4592c7f464db54377339b4f01945522a720`. El merge publicado conserva el árbol probado `0c5cf2e42de2e5b91134f7bc2a9ffe85a19e3603`. [Commit publicado](https://github.com/YaxcheItz/gestorfinanzas/commit/81acd4592c7f464db54377339b4f01945522a720) · [CI de develop](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44441104529).

## Cambios y comprobaciones

- Libro diario conserva los filtros aplicados al paginar o reintentar. Limpiar reemplaza la consulta pendiente. Las fechas invertidas se señalan en el formulario y el vacío filtrado tiene un mensaje propio. A 320 px con texto al 200 %, las fechas conservan el año completo y los importes de Debe y Haber pueden ocupar más de una línea.
- La lectura inicial del catálogo de Captura comprueba la identidad actual después de leer la caché. La regresión reproduce la condición observada en la CI tras un 401 sintético. Se verificó la ausencia de solicitudes protegidas antes de la renovación y de encabezados inválidos en los tres escenarios 200, 401 y 503. [Corrección de arranque](ARRANQUE_CATALOGO_CAPTURA_2026-11-18.md).
- Gastos compartidos mantuvo el saldo personal en la prueba con datos ficticios y conservó los centavos en el reparto 2:1. El recorrido Captura, Actividad, Reportes y Libro diario comprobó un único gasto y su asiento balanceado. Se verificó el regreso al movimiento exacto desde el asiento. [Revisión conjunta](https://github.com/YaxcheItz/gestorfinanzas/blob/856d2dff7deb31b9f6dd34a4c0a3f0cff82d17ef/docs/REVISION_CONJUNTA_LIBRO_DIARIO_2026-11-18.md).

## Producción

Vercel (`7902704607`) y Render (`7902694287`) registraron éxito para `81acd45`. Libro diario, Reportes y Gastos compartidos devolvieron HTTP 200 y el archivo `main-J4J56AHM.js`. La API devolvió HTTP 200 y `UP` desde Vercel y directamente en Render. [Libro diario](https://kaptalgf.vercel.app/libro-diario) · [Estado de la API](https://kaptalgf.vercel.app/api/health).

Los archivos publicados aprobaron 12 comprobaciones en Chromium y Firefox con la API interceptada. Coincidieron 35 recursos JS y CSS por SHA-256 con la compilación local y tres al normalizar saltos de línea. Los escenarios locales con escritura usaron cuentas ficticias y H2 en memoria. Los registros y capturas están en `.local/cierre-recorrido-kaptal/`.

La rama candidata y `develop` aprobaron sus seis trabajos. La ejecución de `develop` acreditó 185 casos con PostgreSQL y cuatro casos separados de PWA. La suite local acreditó 586 unitarias. Al verificar la publicación, cinco trabajos de CI de `main` habían aprobado y el E2E con PostgreSQL seguía en curso. La compilación de Android de `main` aprobó. [CI de la candidata](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44436872526) · [CI de main](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44447825762) · [Android de main](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44447825718).

El arranque de PWA falló en la primera ejecución de filtros y quedó corregido en la candidata. El primer intento de la candidata falló al descargar Maven y aprobó al repetir el trabajo. En el `develop` intermedio fallaron pruebas de categorías y contraste. Ambas aprobaron dos veces en local y la CI del `develop` final aprobó. Se reintentó la conexión Git y se usó el conector para verificar el avance de `develop`. La publicación de `main` y la rama documental se verificaron con Git.

Calendario conservado. Historial, lentitud y logout siguen aplazados.
