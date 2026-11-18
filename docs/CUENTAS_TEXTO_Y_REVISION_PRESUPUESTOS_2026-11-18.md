# Cuentas con texto ampliado y revisión de Presupuestos

18 de noviembre de 2026.

## Corrección de Cuentas

El formulario muestra el **Tipo de cuenta** en varias líneas a 320 px y 200 %. «Tarjeta de Crédito» queda completa. El selector nativo conserva el valor del formulario y el cambio de tipo. Se comprobó el foco visible con Tab, la selección de Ahorro y Crédito y el envío de la tarjeta ficticia con los días de corte y pago previstos.

Se reservaron dimensiones fijas para los márgenes, el icono y el botón de cierre de la confirmación. Así el mensaje conserva su tamaño de texto y recibe más ancho. «Cuenta creada correctamente.» queda en dos líneas y el aviso cabe en la ventana de 320 × 740 px. El control para cerrarlo conserva 44 px de área mínima y ahora tiene nombre. El cambio de espacio se aplica al componente de notificaciones compartido.

Las dos reproducciones anteriores fallaron en claro y oscuro. Tras la corrección, aprobaron seis pruebas de Cuentas en Chromium y las dos regresiones también aprobaron en Firefox. Las pruebas de calendario de Cuentas aprobaron con las fechas y ajustes descritos en la suite existente. [Etapa anterior](AVISOS_SELECCION_INICIO_CUENTAS_2026-11-17.md).

## Revisión de Presupuestos

Se probaron 390 y 1280 px al 100 % y 320 px al 200 %, en claro y oscuro. Con datos ficticios se comprobaron totales de MXN y USD, un presupuesto excedido al 117 %, cambio de mes, error de consulta con reintento y mes vacío, alta con error ficticio de guardado y reintento, y modificación del límite. El detalle abrió y cerró, y el foco regresó al botón que lo abrió.

La revisión visual mostró dos problemas al 200 %. En **Fijar Presupuesto**, dos categorías largas que comparten prefijo se ven iguales al cerrar el selector. El nombre de la moneda también se corta, aunque su código «MXN» queda visible. En tema oscuro, el **Límite mensual** del detalle parte «MX$123,456.78» antes del último dígito. En tema claro ese importe cupo en la muestra.

## Validación y continuidad

Build Angular de 490,08 kB iniciales y TypeScript aprobados. Pasaron 580 unitarias y 12 casos focales de Playwright. Ocho comprobaron Cuentas en Chromium o Firefox. Los otros cuatro cubrieron detalle, formularios y los flujos de Presupuestos en Chromium. Las capturas de antes y después, Presupuestos y los registros quedaron en `.local/cuentas-texto-ampliado/`. Las operaciones usaron una API interceptada y datos ficticios.

La rama `correcciones/cuentas-texto-ampliado` parte de `origin/develop` `0ed4cc7410f351992334bf419486a47080c33c2c` verificado. La corrección de Avisos `05c5946` aprobó sus seis trabajos de CI y sigue en su rama. La referencia de producción verificada fue `73fe866ef72cd098a577690a33b504a070c2e9b9`. [CI de Avisos](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44248036852).

Siguiente etapa. Verificar CI del commit de Cuentas y corregir la lectura de las selecciones y del importe de Presupuestos en una rama nueva. Usar datos ficticios, conservar calendario y mantener aplazados historial, lentitud y logout. La publicación en producción y la instalación en el teléfono requieren confirmación.
