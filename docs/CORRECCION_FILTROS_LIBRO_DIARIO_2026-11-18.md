# Corrección de filtros de Libro diario

18 de noviembre de 2026.

Rama `correcciones/libro-diario-filtros` creada desde `origin/develop` `1f0f4ca` verificado. La revisión previa reprodujo cuatro fallos de filtros en dos navegadores. [Informe de revisión](https://github.com/YaxcheItz/gestorfinanzas/blob/8e56399ba04c2939d27fabe206159b46133f0eec/docs/REVISION_LIBRO_DIARIO_WEB_2026-11-18.md).

## Comportamiento

- Paginar y reintentar usan los filtros confirmados con Aplicar filtros. Las ediciones del formulario quedan pendientes hasta confirmar.
- Limpiar cancela la consulta pendiente y solicita la primera página sin filtros. Solo la consulta vigente puede actualizar la lista.
- Un rango invertido muestra un aviso junto a las fechas y conserva los últimos resultados. Reintentar sigue disponible para fallos de consulta y repite los parámetros aplicados.
- Una búsqueda sin coincidencias muestra «No hay asientos con estos filtros» y ofrece Limpiar filtros. El libro vacío sin filtros conserva el acceso a Movimientos.

## Verificación

Cinco regresiones unitarias fallaron con el componente anterior y aprobaron con la corrección. La suite completa aprobó 585 pruebas en 66 archivos. TypeScript y la compilación de producción de Angular aprobaron. La compilación conserva los avisos previos de tamaño de CSS en Login, Avisos y Bancos y cuentas.

Chromium y Firefox aprobaron diez casos en el build local. Se comprobaron las solicitudes de paginación y reintento, la respuesta tardía al limpiar, la validación y corrección del rango, y el vacío filtrado a 320 px con texto ampliado. La sesión, la API y los asientos eran ficticios. El servidor local rechazó rutas de API sin interceptar. Se registraron cero escrituras, peticiones de incorporación histórica y errores de página. La evidencia está en `.local/libro-diario-filtros/`.

## Continuidad

Revalida el SHA remoto y consulta la CI de esta rama antes de valorar su integración a `develop`. Los recortes de fechas y cifras al 200 % quedan documentados en la revisión visual. Conserva calendario y mantén aplazados historial, lentitud y logout. Publicación web e instalación de APK requieren confirmación por separado. [CI de la rama](https://github.com/YaxcheItz/gestorfinanzas/actions/workflows/ci.yml?query=branch%3Acorrecciones%2Flibro-diario-filtros).
