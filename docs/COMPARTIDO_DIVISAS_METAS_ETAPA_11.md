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

## Pendientes de implementación

Segunda entrega: reparto de pareja por `PARTES`, con cantidades enteras de 1 a 1000000 por persona. Se guardan los pesos originales y los importes resueltos; un total de 10.01 con proporción 2:1 queda en 6.67 y 3.34. No es un porcentaje aproximado ni genera una transacción personal. Se rechaza cualquier reparto que deje a una persona sin un centavo.

Migración aditiva V11: columna nullable `repartos_gasto.partes` y ampliación del CHECK de tipo para aceptar PARTES; las filas anteriores no se recalculan. Respaldo versión 6 conserva los pesos; restauración sigue aceptando versiones 1 a 5 y rechaza pesos fraccionarios en los archivos nuevos. El historial muestra la cantidad de partes junto al importe resuelto.

Validación de esta segunda entrega: backend verify 499 ejecutadas, 493 correctas y 6 omitidas, sin fallos/errores; frontend completo 382 correctas; build de producción correcto. E2E móvil con backend real local: registrar 10.01 en proporción 2:1, recargar y comprobar pesos/importes, saldos propios intactos y rechazo HTTP 400 de 1.5 partes. Restauración verificada con un tercero, manteniendo pesos e importes sin vincular a la cuenta real de la pareja; rechazo de archivo con partes fraccionarias. H2/datos sintéticos. La validación PostgreSQL/migración corresponde al nuevo CI; el CI de la primera entrega (`2f7b108`) terminó en verde.

1. Completar revisión de concurrencia/revocación y liquidaciones existentes. Partes implementadas para pareja; las listas compartidas siguen siendo colecciones de movimientos con roles, no deudas entre veinte personas.
2. Divisas: moneda original, tasa, fecha/fuente y equivalencia secundaria; no sumar monedas diferentes ni reconvertir el pasado al cambiar preferencias.
3. Metas: creación/progreso, aportes y retiros trazables, cancelación y permisos; integrarlas en respaldo/restauración.
4. Regresión completa/CI, publicar y revisar cada entrega. La Etapa 11 sigue abierta hasta completar estos criterios.

Las pruebas usan datos sintéticos; no se modifican fondos reales. Sin merge ni despliegue de producción.
