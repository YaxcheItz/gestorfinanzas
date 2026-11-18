# Revisión de Reportes tras la publicación web

18 de noviembre de 2026.

Se eligió Reportes como siguiente sección porque aparece después de Presupuestos en Configuración. La rama `revision/reportes-web-postpublicacion` parte de `origin/develop` `b0dc3a0`. `main` `01135ec` conserva el mismo árbol de código. La comprobación pública de `/reportes` devolvió HTTP 200 y verificó el JavaScript inicial y el de la sección por SHA-256. La interacción se comprobó en una copia local del build publicado, con sesión, respuestas y cifras ficticias. El servidor de pruebas rechaza las peticiones que queden sin interceptar y el navegador bloquea la red externa. [Reportes en Kaptal](https://kaptalgf.vercel.app/reportes) · [Cierre de publicación web](https://github.com/YaxcheItz/gestorfinanzas/blob/00617c75c5f2f555f1532c44cc974f61e09907c9/docs/PUBLICACION_WEB_AVISOS_CUENTAS_PRESUPUESTOS_2026-11-18.md).

## Hallazgos reproducidos

1. **El filtro de mes y la URL quedan desincronizados.** Abrir Reportes con el rango del 2 al 8 de noviembre de 2026, seleccionar septiembre de 2026 y recargar. Antes de recargar la vista muestra septiembre y `14,000.00` ficticios. La URL conserva `desde` y `hasta` de noviembre. Al recargar regresa el rango de noviembre y se muestran `12,000.00`. Se reprodujo en Chromium y Firefox. El enlace copiado conserva el rango anterior aunque la pantalla muestre el mes nuevo.
2. **El mensaje de mes vacío describe una cuenta sin actividad.** Octubre devuelve un resultado válido y vacío en una sesión que tiene movimientos ficticios en septiembre y noviembre. La pantalla dice «Tu historia empieza con un movimiento». El mensaje debería referirse al mes seleccionado.

## Comprobaciones visuales y funcionales

- El filtro de moneda cambia entre MXN y USD y el filtro de mes consulta el año y mes seleccionados. Se distinguieron carga, fallo HTTP 503 simulado y respuesta vacía. Reintentar quitó el error al recibir la respuesta válida.
- Las cifras con centavos, cero y signo negativo permanecen legibles a 320, 390 y 1280 px al 100 % y 200 %. El importe de prueba de `999,999,999,999.99` usa desplazamiento dentro de la cifra y permite llegar al final con teclado. La prueba de privacidad oculta el cero y el signo negativo.
- A 320 px y texto al 200 %, la categoría ficticia larga se ajusta en varias líneas. El selector nativo de mes queda recortado en la captura de Chromium. El texto de mes seleccionado debajo muestra el mes y año completos.
- La tabla del gráfico se abre con Enter. A 320 px y 200 %, ocupa 359 px con 198 px visibles. Desde «Ver cifras por mes», las flechas alcanzaron la columna Gastos en ambos navegadores. El desplazamiento horizontal con la rueda también la mostró completa. El documento conservó el ancho de la pantalla.
- Se completaron 18 casos de Reportes entre Chromium y Firefox. Incluyen las reproducciones del filtro y dos mediciones de la tabla. Dos casos de Firefox requirieron repetir la aserción con tolerancia numérica porque el navegador calcula `26.4063 px` para el tamaño de referencia `26.4 px`. Se mantuvieron las comprobaciones de importes, líneas, escala y desplazamiento del test original. Dos casos de Metas del archivo compartido también pasaron.

Capturas y registros locales en `.local/revision-reportes-web-postpublicacion/`. La carpeta `muestra/` incluye el antes y después de recargar para ambos navegadores. El fixture y la configuración local se conservan en `.local/worktrees/kaptal-revision-conjunta/frontend/.local/revision-reportes-web/`.

## Continuidad

El cierre de esta etapa es documental. La siguiente intervención acotada es sincronizar el cambio de mes con la URL y ajustar el mensaje del periodo vacío. Conservar calendario y mantener aplazados historial, lentitud y logout. Usar datos ficticios. Cualquier publicación o instalación de APK requiere confirmación independiente.
