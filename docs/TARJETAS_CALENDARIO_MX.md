# Tarjetas: corte y límite de pago en México

Investigación verificada el 21 de octubre de 2026. Implementación en `auditoria/etapa-8-funcional-visual`, sin publicar.

## Qué se verificó

- La guía oficial del estado de cuenta contempla que un vencimiento en fecha inhábil bancaria pueda pagarse en la jornada bancaria hábil posterior. Fuente: [DOF, formato universal, notas aclaratorias 26.a](https://sidof.segob.gob.mx/notas/docFuente/5676037).
- El calendario aplicable es el bancario nacional, no la lista de descansos laborales ni las vacaciones administrativas de la CNBV. La disposición 2026 incluye fines de semana y fechas bancarias específicas; permite cierres extraordinarios y algunas particularidades operativas. Fuente: [DOF/CNBV, calendario bancario 2026, artículos 1–5](https://sidof.segob.gob.mx/notas/docFuente/5775684).
- La referencia de corte suele repetirse cada mes. La fecha real y las condiciones de pago deben contrastarse con el estado de cuenta. Fuente: [CONDUSEF, explicación de corte y pago](https://www.condusef.gob.mx/?idc=905&idcat=1&p=contenido).
- No hay un plazo único para todas las tarjetas. Nu describe su propio periodo y confirma el desplazamiento por días inhábiles; señala su app y estado de cuenta como referencia. No se debe extrapolar ese plazo a Santander u otros emisores. Fuente: [Nu, periodo después del corte](https://blog.nu.com.mx/productos-nu/dudas-sobre-productos-nu/cuantos-dias-tengo-para-pagar-despues-de-mi-fecha-de-corte/).

## Decisión aplicada

1. Conservar el día de corte configurado y ajustarlo únicamente al último día de meses más cortos. No desplazarlo automáticamente por feriados: la regla investigada para el límite no permite inferir la política de corte de cada emisor.
2. Conservar el día **base** de pago indicado por el usuario. Si falta, pedirlo; no rellenarlo sumando 20 días. No usar como nueva base el día desplazado de un solo estado de cuenta.
3. Proyectar el ciclo nominal y desplazar el pago hacia delante hasta encontrar un día hábil del calendario MX verificado. Si el vencimiento ajustado todavía está pendiente aunque la base ya pasó, seguir mostrando ese vencimiento.
4. Mostrar la base cuando hay ajuste y mantener la indicación de estimación. Recordatorios y pantalla leen el mismo archivo de calendario; los dos lenguajes ejecutan las mismas pruebas de contrato.
5. Si falta el calendario anual, conservar la base, avisar que no se ha verificado y no prometer una ampliación. No inventar el calendario de 2027 mediante patrones históricos.
6. No modificar el día guardado, compras, cuotas, intereses ni saldos. El cálculo solo afecta la proyección y el momento del recordatorio de pago.

Ejemplo verificado: base 15/11/2026 (domingo) → 17/11/2026; el lunes 16 es inhábil bancario. Otro ejemplo: base 02/04/2026 → 06/04/2026 por días bancarios inhábiles consecutivos y fin de semana.

## Mantenimiento y límites

El archivo `backend/src/main/resources/calendario-bancario-mx.json` contiene el calendario 2026, fuente y fecha de verificación. El frontend lo importa directamente; no mantiene una segunda lista. Para ampliar años, comprobar la publicación oficial y añadir sus fechas al archivo, incluyendo los casos de prueba correspondientes. No hay descarga automática en tiempo de ejecución.

Alcance: proyección para tarjetas de México, identificada en la pantalla; no calcula calendarios de otros países. No conoce cierres extraordinarios posteriores, plazos particulares de acreditación, cambios contractuales ni todos los esquemas posibles de periodos de gracia. Un día base mensual no representa todos los contratos que calculan el límite contando días desde el corte. La fecha exacta de la app/estado de cuenta del emisor prevalece. No se implementaron cargos automáticos ni cálculo de intereses.

Los recordatorios usan proveedores simulados en pruebas. No se enviaron WhatsApp ni notificaciones reales durante esta entrega.
