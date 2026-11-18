# Presupuestos con texto ampliado

18 de noviembre de 2026.

## Correcciones

En **Fijar Presupuesto**, Categoría y Moneda muestran sus nombres completos. Las selecciones largas ocupan varias líneas y se distinguen aunque compartan prefijo. Se conservaron los menús nativos y la vinculación con el formulario. Se validaron el cambio de selección, el foco visible con Tab y el cierre con Escape. En edición continúa deshabilitado el cambio de categoría.

El **Detalle del Presupuesto** conserva más ancho para sus tres totales en pantallas estrechas. El importe de la reproducción, `MX$123,456.78`, queda en una sola línea a 320 px y 200 % en claro y oscuro. Si un importe necesita otra línea, el salto se hace entre grupos de miles. La prueba de `MX$9,999,999,999,999.99` comprobó que el último grupo y los dos decimales quedan juntos. El formato y los valores siguen viniendo del pipe de montos. Se comprobó que la preferencia de privacidad sustituye los tres importes por `•••`. [Reproducción de la etapa anterior](CUENTAS_TEXTO_Y_REVISION_PRESUPUESTOS_2026-11-18.md).

## Verificación

- La versión anterior reprodujo el salto del último decimal y el recorte de la selección. Se guardaron capturas anteriores y corregidas.
- Tres casos de Playwright aprobaron en Chromium y los mismos tres en Firefox. Se verificaron el formulario y el detalle a 320 px y 200 % en ambos temas, además del detalle a 390 y 1280 px al 100 %. El cierre del detalle devuelve el foco al botón de apertura.
- Tres casos más con API ficticia en Chromium comprobaron formularios, cambio de mes, error y reintento, mes vacío, alta y edición.
- Build Angular de 491,35 kB iniciales, TypeScript y 580 unitarias aprobados. Capturas y registros en `.local/presupuestos-texto-ampliado/`.

## Continuidad

Rama `correcciones/presupuestos-texto-ampliado` creada desde `origin/develop` `0ed4cc7410f351992334bf419486a47080c33c2c` verificado. Los seis trabajos de la CI de Cuentas aprobaron para `4daea3fcbf5355b142e96fc4ac7f9e57286cb414`. Avisos conserva su CI aprobada para `05c5946`. La referencia de producción es `73fe866ef72cd098a577690a33b504a070c2e9b9`. [CI de Cuentas](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44344639336) · [CI de Avisos](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44248036852).

Siguiente etapa. Verificar la CI de Presupuestos y preparar la revisión conjunta de Avisos, Cuentas y Presupuestos con datos ficticios. Conservar calendario y mantener aplazados historial, lentitud y logout. La publicación en producción y la instalación en el teléfono requieren confirmación.
