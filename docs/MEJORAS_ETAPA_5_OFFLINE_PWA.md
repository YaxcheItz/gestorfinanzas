# Etapa 5: captura offline y actualización PWA

Fecha: 8 de octubre de 2026. Implementada y verificada localmente; lista para revisión del usuario.

## Comportamiento

El chat prepara gastos, ingresos y transferencias simples sin conexión, con reglas locales y el catálogo previamente guardado del propio usuario. Preparar una propuesta no modifica saldos. La persona revisa cuenta, fecha, importe y categoría antes de confirmar. Las cuentas ambiguas quedan por seleccionar; fechas inválidas, importes negativos o con más de dos decimales se rechazan. MSI, recurrencias, reportes, IA y transcripción necesitan conexión.

Se conservan texto, propuestas sin confirmar y edición abierta en IndexedDB. No se guarda el historial financiero completo ni se presentan balances locales como actuales. El catálogo conserva únicamente los datos necesarios de cuentas y categorías; los saldos se marcan desactualizados. Abrir la app con conexión previamente permite disponer de los archivos y catálogos para una recarga offline.

Confirmar una propuesta local inserta la solicitud y retira esa propuesta del borrador en una misma transacción de almacenamiento. El aviso de guardado espera `IDBTransaction.oncomplete`; el éxito de un `put` no basta. Si el commit aborta, la propuesta permanece visible y no se informa que esté guardada.

## Sincronización

- Reintentos conservan el UUID y el contenido originales. Las propuestas del servidor conservan su ID y versión; se confirma esa propuesta, sin convertirla en otro movimiento.
- Web Locks coordina los sincronizadores de pestañas del mismo origen y usuario. Sin Web Locks, la protección del servidor sigue evitando repetir una operación con la misma clave.
- La cola solo elimina una solicitud después de una confirmación positiva del servidor y del commit de eliminación en IndexedDB. Una respuesta incierta conserva la solicitud.
- Rechazos definitivos 4xx, salvo 401 y 429, requieren revisión y no se repiten automáticamente. Preparar una corrección genera un UUID nuevo y conserva el pendiente original; revisar Actividad antes de registrar otra solicitud. Un rechazo no demuestra por sí solo que ningún reintento anterior se haya registrado.
- Eliminar un pendiente requiere confirmación y aclara que retirar la copia local no cancela una petición ya recibida por el servidor.
- Cambiar de usuario cancela las peticiones de sincronización observables, limpia la cola visible y descarta respuestas antiguas. Los callbacks de catálogo y guardado del dashboard verifican el usuario de origen.
- Backend almacena una huella SHA-256 del contenido de solicitudes nuevas con clave de idempotencia. Reutilizar esa clave con otros datos se rechaza. Importes equivalentes como 25 y 25.00 producen la misma huella. Se distinguen campos nulos de cadenas literales.

La nueva columna nullable está en `docs/sql/ETAPA_5_OFFLINE.sql`, como referencia aditiva. No se ejecutó en PostgreSQL. Las solicitudes históricas sin huella mantienen compatibilidad; no se reconstruye su contenido original.

## Actualización

`VERSION_READY` muestra un botón para guardar el borrador y recargar. Se evita `activateUpdate()` sobre una página antigua. El botón espera los commits; falla sin recargar cuando no hay espacio, hay un conflicto de borrador, una grabación, una confirmación o una sincronización en curso. También bloquea formularios administrativos modificados. Si se cambia el texto mientras se guarda para actualizar, se conserva la pantalla y se debe repetir la actualización.

Cada borrador tiene una revisión. Una pestaña con una revisión antigua no sobrescribe silenciosamente la revisión guardada por otra: muestra un aviso para conservar el texto antes de recargar. El service worker sigue almacenando archivos de la app, sin añadir caché de respuestas financieras de la API. `runtime-config.js` sigue excluido; el despliegue actual utiliza `/api` mediante proxy del mismo origen.

Fuentes técnicas: [comunicación con el service worker de Angular](https://angular.dev/ecosystem/service-workers/communications) y [confirmación de transacciones IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event).

## Verificación

- Backend: 298 pruebas, 41 suites; cero fallos, errores u omisiones. H2 con commits reales en las pruebas de idempotencia; no PostgreSQL de producción.
- Frontend: 229 pruebas, 27 archivos; todas pasaron. Incluyen commit tardío, aborto posterior al éxito de una solicitud, rechazo definitivo, reintento incierto, cambio de usuario, confirmación por ID/versión, corrección con UUID nuevo y actualización con texto cambiado durante el guardado.
- Build Angular de producción correcto. Bundle inicial de 638.64 kB frente al presupuesto de 500 kB; CSS del login excede su presupuesto por un byte. No se afirma cobertura porcentual ni lint de todo el proyecto.
- Chromium sobre el build real, API sintética servida por HTTP, service worker e IndexedDB reales: migración v2→v3 preservando catálogo anterior; recarga offline; propuesta sin registro; aborto de commit sin falso éxito; cola y borrador atómicos; respuesta 503 después de un registro sintético y reintento con el mismo UUID sin duplicar; bloqueo real entre dos pestañas; actualización real del manifiesto recuperando el texto; conflicto de borradores que impide recargar.
- Inspección de 360×800 claro, 390×844 oscuro, 1280×900 y 844×390: sin desbordamiento horizontal. Sin errores JavaScript. Son tamaños de Chromium, no dispositivos físicos ni pruebas de Safari o Firefox.
- Diff comprobado sin errores de espacios. No se añadieron dependencias, commits, push, despliegues ni movimientos reales.

Evidencias: `replica/mejoras-etapa5/`, en particular `frontend-final.log`, `backend-final.log`, `build-final.log`, `browser-offline.mjs`, `browser-final.log`, `browser-checks.json`, capturas y `verification.json`. Los primeros logs y la captura de fallo se conservan como evidencia de los ajustes de pruebas; el resultado vigente es el final.

## Límites y continuidad

Los datos locales siguen sujetos a espacio disponible, políticas del navegador y borrado de datos del dispositivo. No son un respaldo bancario ni están cifrados por esta etapa. La sincronización requiere una sesión válida y la app abierta; no se implementó ejecución bancaria en segundo plano con la aplicación cerrada. Las propuestas del servidor mantienen su vencimiento y validación en el servidor; offline no los evita.

Antes de publicar, aplicar y verificar migraciones formales y PostgreSQL en etapa 6, junto con los pendientes históricos ya documentados. Etapa 6 no iniciada. Google Wallet y Apple Wallet siguen en la lista de integraciones, pendientes de comprobar viabilidad y permisos en documentación oficial.
