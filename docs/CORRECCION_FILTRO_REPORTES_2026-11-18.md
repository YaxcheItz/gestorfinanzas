# Reportes conserva el filtro mensual

18 de noviembre de 2026.

Rama `correcciones/reportes-filtro-mensual-url` desde `origin/develop` `b0dc3a0` comprobado. La revisión reprodujo el regreso al rango anterior al recargar y un mensaje de primera actividad para cualquier periodo vacío. [Hallazgos de la revisión](https://github.com/YaxcheItz/gestorfinanzas/blob/bca031e9c055d657b81bc3f8434324e897971295/docs/REVISION_REPORTES_WEB_2026-11-18.md).

## Cambios

- Elegir un mes escribe `periodo=AAAA-MM` en la URL y quita los parámetros del rango y su comparación. Conserva la lista activa y los otros parámetros. Tanto al recargar como al abrir el enlace se consulta el mes elegido. Los enlaces previos por fechas conservan sus rangos. El filtro reemplaza la entrada actual de navegación. [Navegación de Angular](https://angular.dev/api/router/NavigationExtras).
- Un mes válido sin datos muestra «No hay movimientos en [mes y año]». La consulta vacía por fechas muestra «No hay movimientos en este periodo». El enlace hacia Actividad y las opciones de reintento siguen disponibles.

## Verificación

Las dos regresiones fallaron con el build anterior y aprobaron en Chromium y Firefox con el cambio. Se comprobó la solicitud mensual después de recargar, el nombre del mes en pantalla, la lista en el enlace y los mensajes de mes y rango vacíos. En Chromium también aprobaron las comprobaciones de estados de carga, error y recuperación, importes, privacidad y gráficos. La ejecución contó 10 casos en Chromium, incluido uno de Metas del archivo compartido, y dos en Firefox. Las cuatro comprobaciones focales se repitieron con la aserción de los parámetros enviados a la API. Angular, TypeScript y 580 unitarias aprobaron. El build conserva los avisos CSS anteriores de Login, Avisos y Bancos y cuentas.

Las comprobaciones usaron una sesión y respuestas ficticias con red externa bloqueada. Evidencia local en `.local/reportes-filtro-mensual-url/`. Para reproducir desde `frontend`, ejecuta `npm run build` y `npx --no-install playwright test -c playwright.reportes-importes.config.ts reportes-periodo-local.spec.ts`.

## Continuidad

Consultar la CI para el SHA de la rama antes de valorar su integración. Producción se verificó en `01135ec`. Se conserva calendario. Historial, lentitud y logout siguen aplazados. Cualquier publicación en producción o instalación de APK requiere confirmación independiente. [CI de la rama](https://github.com/YaxcheItz/gestorfinanzas/actions/workflows/ci.yml?query=branch%3Acorrecciones%2Freportes-filtro-mensual-url).

## Integración en develop

`develop` avanzó de `b0dc3a0` a `1f0f4ca2262303de2f86896b4f8782f4b8b1de3c` conservando el commit que aprobó los seis trabajos de la CI de la corrección. La nueva CI de `develop` aprobó los seis trabajos, incluidos Chromium con PostgreSQL, PWA y navegación con datos ficticios. La compilación Android de `develop` también aprobó. [CI de la corrección](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44409434511) · [CI de develop](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44418976896) · [Android de develop](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44418976906).

Se simuló localmente el merge con `main` `01135ec`. El resultado fue el mismo árbol probado, `fbef048e9edab4a40ea26be48d15c7676901e656`. Se revalidó `main` y el dominio público después de la integración. `/reportes` respondió HTTP 200, su JavaScript y el archivo inicial coinciden por SHA-256 con la publicación de `01135ec`, y `/api/health` respondió 200 y UP. Evidencia en `.local/reportes-filtro-mensual-url/`. [Kaptal web](https://kaptalgf.vercel.app/reportes).

La publicación en producción web quedó pendiente de confirmación al completar esta etapa.

## Publicación en producción web

El 18 de noviembre de 2026, tras la confirmación del propietario, `main` avanzó de `01135ec` a `17f007505df5cbc26734d5c1d534dbd97267fcc9`. El merge conserva exactamente el árbol `fbef048e9edab4a40ea26be48d15c7676901e656` de `develop` `1f0f4ca`, con los seis trabajos aprobados. El diff funcional se limita al filtro y al mensaje de Reportes. [Commit de publicación](https://github.com/YaxcheItz/gestorfinanzas/commit/17f007505df5cbc26734d5c1d534dbd97267fcc9).

Vercel Production (`7899805429`) y Render (`7899797332`) registraron éxito para el commit de publicación. El dominio público sirvió `/reportes` con HTTP 200 y `main-RXSDO6MA.js`. `/api/health` devolvió HTTP 200 y `UP` a través del dominio público y directamente en Render. [Reportes en producción](https://kaptalgf.vercel.app/reportes) · [Estado de la API](https://kaptalgf.vercel.app/api/health).

Las dos regresiones de Playwright aprobaron en Chromium sobre los archivos servidos por Vercel. La prueba usó sesión y API ficticias, con el navegador aislado y cero escrituras o errores de página. Se comprobó el mes tras recargar, la lista activa y los mensajes de mes y rango vacíos. Coincidieron por SHA-256 35 recursos JavaScript y CSS del build aprobado. `startup-check.js` y `styles/capture.css` coincidieron al normalizar saltos de línea Windows/Linux. Evidencia local en `.local/reportes-filtro-mensual-url/publicacion-web/`.

Al cierre, la CI de `main` tenía cinco trabajos aprobados y el E2E Chromium con PostgreSQL en curso. La compilación Android de `main` aprobó. La instalación de una APK requiere confirmación independiente. [CI de main](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44425227219) · [Compilación Android de main](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44425227189).

Calendario conservado. Historial, lentitud y logout siguen aplazados. La siguiente revisión web puede continuar con Libro diario, que sigue a Reportes en Configuración, usando datos ficticios.
