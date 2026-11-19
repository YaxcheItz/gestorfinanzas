# Fechas y partidas legibles en Libro diario

18 de noviembre de 2026.

La rama `correcciones/libro-diario-legibilidad` se creó desde `develop` remoto `1f0f4ca` y avanzó sobre `149277c`, la corrección de filtros. El cambio visual da espacio a los campos nativos de fecha en móvil y permite que los importes de Debe y Haber ocupen más de una línea cuando superan el ancho de la tabla. Se conservan las cifras, su moneda y la escala de texto.

## Verificación

- Chromium y Firefox con configuración regional `es-MX`. Se midieron 24 combinaciones de ancho, tema y escala por versión, con cuatro importes por combinación. Antes se recortaron 12 de los 96 importes medidos y después se vieron completos los 96 al desplazar la tabla. Los importes ficticios incluyen `9,876,543,210.12` MXN y `999,999,999,999.99` USD.
- A 320 px y texto al 200 %, se inspeccionaron los campos Desde y Hasta en ambos navegadores. El año y el icono del selector se ven completos en las imágenes finales. Hay 20 capturas por versión en `.local/libro-diario-legibilidad/`.
- Aprobaron las dos regresiones de Playwright de fechas e importes. Pasaron la compilación de Angular, TypeScript y 585 pruebas unitarias. El navegador usó una sesión y respuestas ficticias en un servidor local.

## Continuidad

Revalidar la CI de la rama y la comprobación de arranque pendiente en la corrección de filtros antes de la promoción web. Completar la revisión de Gastos compartidos y el recorrido entre secciones con datos ficticios. Se conserva el calendario. Historial, lentitud y logout siguen aplazados.
