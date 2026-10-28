# Reparto de comida y transporte

El propietario reportó una compra habitual de Rappi clasificada como Otros gastos. Es un reporte real del propietario; no se ha importado su aviso ni hecho una compra de prueba. El catálogo anterior no incluía Rappi, confundía DiDi Food con DiDi de transporte y dejaba UberEats unido como desconocido.

El clasificador de compras nuevas reconoce primero la expresión completa de reparto y después las palabras de actividad. Se conservan límites de palabra para evitar coincidencias dentro de otros nombres y se normalizan espacios, acentos y separadores bancarios.

| Comercio reconocido | Categoría de gasto |
| --- | --- |
| Rappi, incluida la expresión Rappi Turbo | Comida |
| Uber Eats / UberEats | Comida |
| DiDi Food / DiDiFood | Comida |
| PedidosYa / Pedidos Ya | Comida |
| Just Eat / JustEat | Comida |
| DoorDash / Door Dash | Comida |
| Uber / DiDi sin la expresión de comida | Transporte |

Son reglas explícitas de comercio, sin IA. El catálogo no pretende conocer cualquier plataforma futura. Los servicios de reparto también pueden vender artículos no alimentarios: si el texto identifica otra actividad reconocida (por ejemplo farmacia), se conserva la alternativa ambigua Otros gastos. RappiCard/RappiPay y sus formas separadas se tratan como intermediarios financieros. PayPal/Mercado Pago y otros intermediarios conservan su prioridad de revisión.

Comida reutiliza también una categoría personal equivalente llamada Alimentación, sin renombrar categorías ni crear duplicados. Si hay varias equivalentes activas o una personal archivada, se respetan las reglas de ambigüedad/archivado existentes. Las categorías fijas y las correcciones manuales prevalecen. Los reintentos conservan movimiento y categoría efectiva originales; no se reclasifica el historial, incluida la compra Rappi ya reportada.

## Comprobaciones

Regresión roja:69casos,19fallos reproducidos antes del cambio. Tras corregir:87casos focales backend, cero fallos/errores/omisiones, con H2 y proveedores IA deshabilitados. Incluyen persistencia de categoría de reparto/transporte, reentrega única, corrección manual, consentimiento Revolut, saldo y aislamiento de IA. CI/PostgreSQL/E2E, integración y publicación se registran en `.local/reparto-categorias-delivery.json`. No requiere nueva APK, migración ni dependencia.

No hay QA financiera productiva, llamadas reales de IA, recuperación de descartados ni importación de avisos. El resultado real corregido se observará únicamente en una compra habitual futura. Los cambios de diseño y la revisión de seguridad quedan en las etapas acordadas; el plan añade rendimiento antes del diseño y seguridad después.

## Referencias de las plataformas

Nombres/servicios contrastados con sus páginas oficiales: [Rappi México](https://www.rappi.com.mx/), [DiDi Food](https://www.didi-food.com/), [Uber Eats México](https://www.ubereats.com/mx), [PedidosYa](https://www.pedidosya.com/), [Just Eat](https://www.just-eat.es/) y [DoorDash](https://www.doordash.com/). Son referencias del catálogo, no pruebas de una compra ni de una recepción bancaria productiva.
