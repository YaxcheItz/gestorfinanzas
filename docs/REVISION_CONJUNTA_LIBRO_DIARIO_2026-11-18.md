# Revisión conjunta de Captura, Gastos compartidos y Libro diario

18 de noviembre de 2026.

Revisión de la compilación local de la rama de legibilidad `c8f8bc8`. Las cuentas y los movimientos fueron ficticios. Se usó el backend de pruebas con H2 en memoria y el correo desactivado. Las pruebas de legibilidad del navegador usaron API interceptada.

## Gastos compartidos

- Con un aporte de 100.00 MXN y un gasto de 10.01 MXN en relación 2:1, el fondo quedó en 89.99 MXN. El reparto quedó en 6.67 y 3.34 MXN. La lista de cuentas personales antes y después fue idéntica. Se comprobó el saldo y la descripción del gasto a 320 px con texto al 200 %.
- La revisión de interfaz verificó nombres largos, apertura y cierre con Escape de los formularios de aporte, gasto y pago, y los cuatro tipos de reparto. En la prueba del backend, rechazó partes fraccionarias. Evidencia en `.local/cierre-recorrido-kaptal/`.

## Recorrido entre secciones

El formulario de Captura guardó un gasto ficticio de 127.35 MXN. Actividad lo mostró una vez. Reportes mostró cero gastos en octubre y 127.35 MXN en noviembre. La selección de noviembre se conservó al recargar. Libro diario generó un asiento con 127.35 MXN en Debe y Haber y el vínculo al movimiento original volvió a la entrada correcta de Actividad.

En octubre, el backend devolvió la fila de MXN con ingresos y gastos en cero. Reportes mantuvo los totales en cero y mostró «No hay gastos en esta moneda y periodo». El estado sin filas se había comprobado por separado con una respuesta ficticia vacía.

Las pruebas adicionales de captura escrita y voz simulada aprobaron. La ejecución inicial de voz sobre el servidor de producción local alcanzó el mensaje de Groq sin proveedor. El mismo caso aprobó con la configuración E2E de CI y la respuesta de transcripción interceptada. La voz real queda fuera de esta evidencia.

## Alcance

Los comprobantes, capturas y registros se guardaron en `.local/cierre-recorrido-kaptal/`. La rama es documental. El calendario se conserva. Historial, lentitud y logout siguen aplazados.
