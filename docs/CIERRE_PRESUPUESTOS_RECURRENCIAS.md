# Cierre de presupuestos y recurrencias

Rama `correcciones/presupuestos-recurrencias`, desde `develop == origin/develop` en `e947227ba1a21f4ef6b9ad0d13c12ad8285d0990` (PR #71 integrado). Esta entrega corrige la etapa existente; el asistente con evidencias sigue siendo la siguiente etapa funcional.

## Presupuestos

El disponible respeta la lista autorizada y la moneda de la cuenta. Una consulta sin lista usa Personal. Nunca se usa el primer presupuesto de otra lista o moneda. El soporte legado sin lista consulta exclusivamente registros realmente sin lista, que representan un presupuesto global propio. Crear un presupuesto sin lista no puede apropiarse de uno de otra lista.

El registro rápido retira el disponible anterior mientras consulta la nueva selección. Los importes y el porcentaje consumido se ocultan en modo privado. El bloque puede partirse en varias líneas para conservar los controles en móvil.

## Respaldo JSON versión 5

Cada presupuesto guarda lista y porcentaje de alerta. Las recurrencias conservan fecha final y las transacciones mantienen su vínculo a la plantilla restaurada, mediante ids nuevos del usuario destino. Se validan referencias antes de escribir. Las listas continúan restaurándose como copias privadas, sin participantes ni invitaciones.

Se aceptan versiones 1 a 4. Si un archivo antiguo no guardó lista ni umbral de presupuesto, se usa Personal y 80%. No se puede inferir información que el archivo anterior no incluyó. Dos presupuestos de igual categoría/mes son validos si pertenecen a listas distintas. Los límites globales sin lista de un respaldo v5 conservan ese alcance.

No se modifican migraciones publicadas: la base sigue en V6. La versión del archivo JSON es independiente de Flyway.

## Series y contabilidad

Solo este movimiento conserva la alternativa de editar una instancia sin cambiar la plantilla. Este y los siguientes actualiza la instancia elegida y la plantilla para futuras operaciones. Toda la serie aplica categoría, notas, lista y etiquetas al historial; conserva los importes, tipos y cuentas de las otras operaciones ya registradas. El texto del selector explica esta distinción.

Cada movimiento histórico modificado genera su auditoría y la reclasificación correspondiente en el libro diario, dentro de la misma transacción. Los movimientos automaticos de cashback conservan el contexto del gasto sin alterar sus importes. Se comprueba el permiso de escritura sobre cada lista de origen; no se aplican categorias incompatibles con el tipo del movimiento.

La fecha final se comprueba antes de mover dinero. Si la siguiente ocurrencia supera la fecha final, la plantilla no puede reactivarse sin ampliar o quitar primero ese límite. Las ocurrencias pendientes anteriores al límite siguen siendo registrables. Una ocurrencia exactamente en la fecha final si se admite. Cambiar la fecha final no reactiva una serie pausada automáticamente.

## Verificación

Pruebas PostgreSQL de mezcla de listas/monedas, respaldo con presupuestos duplicados por categoría en listas distintas, umbrales, fecha final, ids remapeados, compatibilidad v4, referencias externas, auditoría y libro diario. Recorrido Playwright de captura, privacidad, geometria móvil, cambio de moneda y restauracion por API. Resultados finales en `replica/cierre-presupuestos-recurrencias/verification.json` y `ESTADO_SESION.md`.

No equivale a una prueba en Android físico. No se conectan bancos, correos ni servicios externos.
