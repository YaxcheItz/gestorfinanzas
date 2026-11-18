# Corrección de Avisos y revisión de Inicio y Cuentas

## Revisar aviso

En el build de `main` publicado tras PR291 se reprodujo el recorte a 320 px y 200 % con dos cuentas y dos categorías ficticias que compartían prefijo. Los valores «Cuenta ficticia para gastos del hogar» y «Cuenta ficticia para gastos del trabajo» mostraban el mismo fragmento al cerrar el selector. En Categoría ocurría lo mismo con «Compras familiares de primera necesidad» y «Compras familiares de celebración». [Revisión anterior](REVISION_AVISOS_WEB_PR291_2026-11-17.md).

La corrección permite que el nombre seleccionado ocupe varias líneas en Cuenta y Categoría. El selector nativo conserva el modelo, el menú y la navegación por teclado. En el build corregido se verificaron la selección inicial, el cambio entre opciones, el retorno a «Por elegir» y «Sin categoría», y la recuperación del foco al cerrar con Escape. El texto permaneció a 32 px en la prueba al 200 % y cupo sin desborde horizontal. Se probó Chromium y Firefox en tema claro y oscuro, con 320 px al 200 % y 390 y 1280 px al 100 %.

## Inicio y formulario de Cuentas

| Sección | Resultado |
| --- | --- |
| Inicio | Los controles de Recientes fueron alcanzables con desplazamiento y foco. Buscar devolvió el movimiento ficticio y Escape devolvió el foco al botón. La captura escrita se pudo abrir, llenar y cerrar sin envío. La tarjeta de Recientes sigue mostrando una descripción abreviada para el nombre largo de prueba. |
| Cuentas | Alta y edición ficticias de una tarjeta en MXN. Se comprobó día de corte y día base de pago. El guardado sin día de pago mostró el aviso esperado y no envió solicitud. Tras un 503 simulado, el formulario conservó los valores y permitió reintentar. El guardado de la edición actualizó la tarjeta ficticia. |

En Cuentas quedaron dos hallazgos en ambos temas a 320 px y 200 %. **Tipo de cuenta** muestra «Tarjeta de C…» con el selector cerrado. **Cuenta creada correctamente** ocupa una columna de 22 px y se reparte en 23 líneas, llegando a superponerse a la pantalla. Las acciones de guardado se pudieron usar. Los hallazgos quedan para la siguiente etapa de Cuentas.

## Evidencia y continuidad

Build Angular y TypeScript aprobados. Pasaron 580 pruebas unitarias de frontend. Los 18 casos focales de Playwright incluyen seis de Avisos en Chromium, dos de la regresión en Firefox, seis de Bancos y cuentas con Android simulado y cuatro de Inicio y Cuentas en Chromium. Las peticiones de esta revisión se resolvieron con datos ficticios. Las capturas anteriores y corregidas, los resultados de Inicio y Cuentas y los registros locales quedaron en `.local/avisos-seleccion-texto/`.

El build inicial quedó en 489,19 kB. El compilador emitió un aviso para los 5,25 kB de CSS de Avisos, frente al umbral de aviso de 4 kB. La rama `correcciones/avisos-seleccion-texto` parte de `origin/develop` `0ed4cc7410f351992334bf419486a47080c33c2c` verificado. La corrección queda disponible para revisión en esa rama. La referencia de producción durante esta etapa fue `73fe866ef72cd098a577690a33b504a070c2e9b9`.

Siguiente etapa. Verificar CI del commit remoto, corregir el recorte y la confirmación de Cuentas con datos ficticios y continuar después por Presupuestos. Conservar calendario y mantener aplazados historial, lentitud y logout. La publicación en producción y la instalación en teléfono requieren confirmación.
