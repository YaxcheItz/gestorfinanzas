# Etapa 11: compartido, divisas y metas

## Orden autorizado

El propietario da la Etapa 9 por completada provisionalmente y traslada sus comprobaciones físicas a la revisión final. No equivale a certificar instalación, cierre por Android ni permisos en dispositivo. Durante esta entrega integró PR #101 en develop (`3af6e80`); se actualizó la rama de Etapa 11 con ese develop y se conservaron ambas documentaciones. PR #102 contiene esta primera entrega hacia develop, como borrador, sin integrarlo.

Orden: **11 → base Android con Capacitor/APK → 10 sin Gmail → 12 → 13 → revisión final**. Distribución Android mediante APK firmado descargable, sin publicación en Play Store. Widgets y ajustes rápidos necesitan componentes Android adicionales; empaquetar Angular no los crea automáticamente. Gmail queda fuera. Comercialización opcional.

## Revisión inicial

- Listas existentes: invitaciones con vencimiento y hash, editor/lector, archivo, salida y retiro de participantes. Los movimientos conservan autor y cada participante usa sus propias cuentas.
- Pareja ya guarda repartos iguales, por porcentaje e importe exacto, con partes monetarias persistidas; revisar antes de extender a partes y liquidaciones.
- Transacciones/asientos ya tienen tasa de cambio. Falta revisar trazabilidad de fecha/fuente y equivalencias sin alterar el pasado.
- No se encontró un modelo de metas en el código inspeccionado. Diseñar aportes/retiros como movimientos entre fondos propios, sin inflar ingresos/gastos, e incluir migración y respaldo.

## Primera entrega: cambiar roles

`PATCH /api/listas/{id}/miembros/{miembro}/rol`, cuerpo `{ "rol": "EDITOR" }` o `LECTOR`. Solo el propietario administra. No puede degradarse ni convertir otro participante en propietario; no se puede cambiar a un usuario ajeno a la lista. Comparte el bloqueo pesimista de la lista con escritura, invitaciones y retiros para serializar cambios de permisos.

La interfaz de participantes permite hacer editor/lector manteniendo la lista abierta y actualizando el resultado del servidor. No elimina movimientos ni cambia cuentas, saldos o autoría. Una sesión que tenga una pantalla antigua debe respetar el nuevo permiso en la siguiente solicitud backend. Los códigos de invitación existentes no cambian el rol de un miembro que ya pertenece a la lista.

El recorrido E2E detectó que una unión desde otra sesión no aparecía en el panel previamente cargado. Corregido: recargar al abrir y actualizar los participantes de la lista editada al recibir el resultado. La repetición completa pasó.

Validación local: backend `mvnw verify`, 495 ejecutadas = 489 correctas + 6 omitidas, cero fallos/errores; frontend 381 correctas en 45 archivos tras actualizar develop; build de producción correcto. Dos E2E correctos tras actualizar develop: accesos de captura y recorrido móvil de listas: crear lista, compartir, denegar escalada de privilegios y rol inválido, promover/degradar desde la interfaz y comprobar persistencia, etiquetas y aislamiento. H2 y usuarios sintéticos. PostgreSQL/CI pendiente de publicación. No se certifica Android físico ni producción autenticada.

Skills aplicadas: Ponytail, Angular, security-review, debugging-and-error-recovery, Playwright, ecc-verification-loop y documentation-and-adrs.

## Reparto por partes

Segunda entrega: reparto de pareja por `PARTES`, con cantidades enteras de 1 a 1000000 por persona. Se guardan los pesos originales y los importes resueltos; un total de 10.01 con proporción 2:1 queda en 6.67 y 3.34. No es un porcentaje aproximado ni genera una transacción personal. Se rechaza cualquier reparto que deje a una persona sin un centavo.

Migración aditiva V11: columna nullable `repartos_gasto.partes` y ampliación del CHECK de tipo para aceptar PARTES; las filas anteriores no se recalculan. Respaldo versión 6 conserva los pesos; restauración sigue aceptando versiones 1 a 5 y rechaza pesos fraccionarios en los archivos nuevos. El historial muestra la cantidad de partes junto al importe resuelto.

Validación de esta segunda entrega: backend verify 499 ejecutadas, 493 correctas y 6 omitidas, sin fallos/errores; frontend completo 382 correctas; build de producción correcto. E2E móvil con backend real local: registrar 10.01 en proporción 2:1, recargar y comprobar pesos/importes, saldos propios intactos y rechazo HTTP 400 de 1.5 partes. Restauración verificada con un tercero, manteniendo pesos e importes sin vincular a la cuenta real de la pareja; rechazo de archivo con partes fraccionarias. H2/datos sintéticos. La validación PostgreSQL/migración corresponde al nuevo CI; el CI de la primera entrega (`2f7b108`) terminó en verde.

## Metas y divisas implementadas

Metas en `/metas`, accesibles desde Herramientas. Cada meta crea una cuenta AHORRO a cero con objetivo y estado cancelada/reanudada. No se inventa un saldo adicional: progreso = saldo del apartado. Aportes y retiros usan TRANSFERENCIA entre cuentas propias, de la misma moneda en este formulario, con clave de idempotencia que se conserva al reintentar la misma solicitud. Pueden retirarse fondos de una meta cancelada. Cancelar no borra el saldo ni ejecuta devoluciones; el historial conserva autor e importes. La moneda de la meta no cambia, aunque todavía no tenga movimientos. El importe del objetivo y los saldos respetan ocultación de montos.

Es un apartado virtual de la contabilidad de Kaptal; no abre una cuenta bancaria ni ejecuta transferencias bancarias reales. Las cuentas de ahorro de metas aparecen en Cuentas y sus movimientos en el historial personal. No hay suma de metas de diferentes monedas.

Divisas: las transferencias conservan moneda e importe original, tasa aplicada e importe recibido redondeado a centavos. Se añade fuente `MANUAL` y fecha aplicada para las nuevas transferencias entre monedas; esa fecha es la fecha elegida para la operación, no la fecha de una cotización oficial. Cambiar la moneda preferida no reconvierte el pasado. El historial móvil muestra la referencia; CSV y respaldo también la conservan. Filas antiguas sin fuente permanecen desconocidas; no se les inventa procedencia. No se integró un proveedor de cotizaciones.

Migraciones aditivas V12 (objetivo/estado en cuentas) y V13 (fuente/fecha en transacciones). Respaldo v7 incluye metas y divisas; restaurador admite v1-v7, valida objetivos/referencias y remapea las cuentas al nuevo propietario.

Liquidaciones y concurrencia: revisados los servicios existentes y sus pruebas de permisos, aceptación concurrente, desvinculación frente a registro y eliminación. La prueba `unPagoSalaLaDeudaSinMoverElFondo` verifica que un pago reduce deuda sin sumar gasto ni modificar el fondo compartido. Compartido sigue siendo anotación de deuda/aportes; no mueve dinero bancario ni cuentas personales. Partes implementadas para pareja; las listas compartidas siguen siendo colecciones de movimientos con roles.

## Correcciones del CI anterior

El run 271 falló por expectativas obsoletas de versión de respaldo, conteos de migraciones y un aviso nuevo de Vitest; no por un fallo al aplicar V11. Actualizadas las expectativas a respaldo v7 y migraciones V1-V13; la prueba de rollback usa V14 temporal, evitando colisión con V11 real. Conserva comprobación de checksum, rollback y no adopción de bases desconocidas.

Vitest actualizado a 4.1.12, parche de [registro de mocks](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) y [recorrido de rutas en Windows](https://github.com/advisories/GHSA-xp26-3454-mjgp). La auditoría vuelve a pasar; siguen cinco avisos de desarrollo de braces ya documentados, sin ampliar excepciones.

Validación local de la tercera entrega: 382 pruebas frontend correctas con Vitest 4.1.12, build y auditoría correctos. Cinco integraciones nuevas de metas/divisas correctas; suite backend completa final, incluido CSV: 509 ejecutadas, 503 correctas + 6 omitidas, cero fallos/errores. E2E: metas/divisas correcto; cuatro flujos de recuperación/presupuestos correctos. El primer E2E de metas encontró una etiqueta ambigua del selector; corregida y repetido correctamente. Datos sintéticos/H2. Consultar el resultado remoto actual de PostgreSQL/migraciones/recuperación en PR #102 antes de integrar.

Proteccion adicional en servidor: no retirar mas que el saldo de la meta, no aportar desde fondos insuficientes o credito y no recibir transferencias nuevas estando cancelada. Editar valida el saldo final (permite reversiones intermedias); borrar un aporte ya retirado no puede dejar la meta en negativo. Cinco regresiones adicionales correctas y E2E de rechazo/rollback confirmado.

## Cierre pendiente

Revisar el nuevo CI completo, PostgreSQL/migraciones/recuperación y PR #102. Las comprobaciones físicas/autenticadas de las etapas anteriores siguen trasladadas a la revisión final por instrucción del propietario. Después de integrar y revisar esta etapa corresponde una rama nueva para Capacitor/APK firmado descargable, sin Play Store. Gmail permanece fuera. No se autoriza merge ni despliegue de producción por publicar el PR.

Las pruebas usan datos sintéticos; no se modifican fondos reales. Sin merge ni despliegue de producción.
