# Revisión web de Libro diario

18 de noviembre de 2026.

La rama `revision/libro-diario-web-postpublicacion` parte de `origin/develop` `1f0f4ca`, con el mismo árbol `fbef048` que `main` `17f0075`. Los seis trabajos de CI de `main` ya aprobaron. `/reportes` y `/libro-diario` respondieron HTTP 200 con `main-RXSDO6MA.js` y la API respondió `UP`. [Libro diario publicado](https://kaptalgf.vercel.app/libro-diario) · [CI de main](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44425227219) · [Informe de Reportes](https://github.com/YaxcheItz/gestorfinanzas/blob/50969109b808825c54e3833e7a194023f0c8c6c4/docs/CORRECCION_FILTRO_REPORTES_2026-11-18.md).

## Filtros y estado de la consulta

Reproducido en Chromium y Firefox con archivos publicados, sesión ficticia e interceptación de la API.

1. **Limpiar durante la carga deja la lista filtrada.** Seleccionar Transferencia, aplicar y mantener pendiente la respuesta. Tras pulsar Limpiar, el selector vuelve a Todos. Cuando llega la respuesta pendiente, aparece la lista de transferencias. Se registraron dos solicitudes, la inicial y la filtrada.
2. **Cambiar de página aplica una edición del formulario sin confirmación.** En una lista sin filtros con dos páginas, seleccionar Transferencia y pulsar Siguiente. Se envía `page=1&tipoMovimiento=TRANSFERENCIA` sin pulsar Aplicar filtros. La nueva consulta arranca en la segunda página.
3. **Reintentar envía el rango inválido.** Poner Desde en `2026-11-30` y Hasta en `2026-11-01`. Aplicar filtros muestra el aviso local y omite el GET. Reintentar sí envía esas fechas. El controlador responde con HTTP 400 para esa combinación. En navegador se usó una respuesta 400 ficticia.
4. **El vacío filtrado presenta el mensaje del libro sin asientos.** Tras comprobar que la lista general tiene asientos ficticios, aplicar un tipo sin coincidencias. La página muestra «Aún no hay asientos contables» y explica qué aparecerá al registrar un movimiento. El control Limpiar sigue disponible.

Con filtros ya aplicados, la navegación envía los mismos parámetros de fechas, movimiento, evento y cuenta. Limpiar tras completar la carga vuelve a la primera página sin parámetros de filtro. También se distinguieron carga, fallo HTTP 503, reintento mediante teclado y vacío general. El enlace al movimiento original llevaba el identificador ficticio correcto y el asiento de reversión explicaba por qué el movimiento fue eliminado.

## Lectura de fechas y partidas

- Se midieron 24 combinaciones de navegador, ancho, escala y tema. La página conservó el ancho del documento a 320, 390 y 1280 px al 100 % y 200 %, en claro y oscuro. Las tablas admitieron foco con Tab y desplazamiento con flechas. Se verificaron las etiquetas Debe y Haber y un asiento ficticio con partidas MXN y USD.
- A 320 px y texto al 200 %, el selector nativo recorta parte de la fecha en ambos navegadores. El resumen debajo de los campos sí muestra ambas fechas completas.
- A 320 px y texto al 200 %, el importe ficticio `MX$9,876,543,210.12` en Haber mide unos 294 px en tema oscuro y la ventana de la tabla ofrece 278 px. Hace falta desplazarla para leer sus partes. En tema claro, el importe mide unos 262 px y se ve entero al ajustar el desplazamiento.

## Evidencia y continuidad

Se ejecutaron 14 casos en Chromium y Firefox con configuración regional `es-MX`. Se guardaron 54 capturas. Hubo cero escrituras, peticiones de incorporación histórica y errores de página. Se verificaron 35 recursos JavaScript y CSS por SHA-256 y otros tres tras normalizar saltos de línea. El navegador usó un servidor local que sirvió los archivos públicos y rechazó peticiones de API sin interceptar. Los registros y la reproducción están en `.local/revision-libro-diario-web-postpublicacion/`.

El cierre es documental. La siguiente etapa propuesta es corregir el estado de los filtros en una rama nueva desde `develop` verificado. Debe distinguir el formulario de la consulta aplicada, asegurar que Limpiar recargue resultados sin filtros durante una petición, evitar el reintento de rangos inválidos y dar al vacío filtrado un mensaje propio. Los recortes de fechas e importes quedan como hallazgos visuales de esta revisión.

Conserva calendario y mantén aplazados historial, lentitud y logout. Usa datos ficticios. La publicación en producción y la instalación de APK requieren confirmación por separado.
