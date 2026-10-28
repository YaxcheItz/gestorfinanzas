# Revolut: conservar la cuenta de ahorro existente

La configuración de registro automático filtraba Revolut exclusivamente por `DEBITO`, mientras que la pantalla de cuentas permite crear `AHORRO`. Una cuenta de ahorro MXN existente quedaba fuera del selector y el backend rechazaba su consentimiento de ingresos. Crear otra cuenta y eliminar la anterior no resuelve esa incompatibilidad sin perder asociaciones o separar el historial.

Se permiten `AHORRO` y `DEBITO` en MXN para Revolut. El backend comprueba los mismos tipos y moneda al guardar el consentimiento y al recibir cada ingreso. Efectivo, crédito, inversión y otras monedas siguen excluidos del consentimiento; no se amplían los tipos de los otros bancos. La cuenta conserva identidad, tipo, saldo, movimientos y asociaciones: esta entrega no migra, elimina ni vuelve a crear cuentas.

El consentimiento específico de ingresos sigue siendo obligatorio y no se activa por actualizar. La compra y el ingreso usan la misma asociación y la deduplicación existente. Santander conserva su restricción de gastos; Sears conserva sus dos terminaciones y destino. No se cambia el clasificador ni se reclasifica el historial.

La APK0.1.17/código18 incluye el selector corregido. La firma y los datos se conservan mediante actualización sobre la instalación existente. El propietario delegó usar la única asociación Amex sin exigir terminación, para admitir los avisos sin tarjeta. Esa configuración debe guardarse únicamente después de comprobar que el backend publicado admite ahorro Revolut, que no hay envíos pendientes y que el resto de asociaciones se mantiene.

## Evidencia y límites

- Antes del cambio, regresión backend de ahorro rechazada y prueba frontend del selector fallida.
- Después:29casos backend focales correctos, incluidos ingresos, reintentos, saldo, rechazo de otros tipos, categorías y aislamiento de IA;12pruebas frontend correctas y build productivo correcto.
- Al reconectar el Samsung se actualizó0.1.15→0.1.16con la misma firma, UID y fecha de primera instalación. Sesión y registro activo conservados. Veinte pruebas Store/Worker físicas correctas en el paquete debug aislado con la fuente final de0.1.16; no representan movimientos bancarios reales.
- CI, publicación, hash e instalación de0.1.17y configuración efectiva se registran en `.local/revolut-ahorro-delivery.json` y en el avance más reciente de estado/plan. No considerar completado ese paso por el mero build.
- Sin migración de esquema, importación de ejemplos, recuperación de avisos descartados, compras de prueba ni QA financiera productiva. La primera recepción real de los formatos nuevos y categoría sigue pendiente del uso habitual. No hay llamadas de IA para estas comprobaciones.

Siguiente: continuar los pendientes operativos de Etapa13; diseño completo al final con el propietario por secciones, incluidas etiquetas. Mantener Gmail deshabilitado, Desktop intacto y TalkBack omitido.
