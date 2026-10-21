# Etapa 11: compartido, divisas y metas

## Orden autorizado

El propietario da la Etapa 9 por completada provisionalmente y traslada sus comprobaciones físicas a la revisión final. No equivale a certificar instalación, cierre por Android ni permisos en dispositivo. PR #101 conserva esa entrega en su rama; no se incorpora por rutina en esta etapa.

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

Validación local: backend `mvnw verify`, 495 ejecutadas = 489 correctas + 6 omitidas, cero fallos/errores; frontend 366 correctas en 43 archivos; build de producción correcto. E2E móvil real local correcto: crear lista, compartir, denegar escalada de privilegios y rol inválido, promover/degradar desde la interfaz y comprobar persistencia, etiquetas y aislamiento. H2 y usuarios sintéticos. PostgreSQL/CI pendiente de publicación. No se certifica Android físico ni producción autenticada.

Skills aplicadas: Ponytail, Angular, security-review, debugging-and-error-recovery, Playwright, ecc-verification-loop y documentation-and-adrs.

## Pendientes de implementación

1. Completar revisión de concurrencia/revocación en listas y repartos existentes; añadir partes y liquidaciones donde falten, conservando centavos.
2. Divisas: moneda original, tasa, fecha/fuente y equivalencia secundaria; no sumar monedas diferentes ni reconvertir el pasado al cambiar preferencias.
3. Metas: creación/progreso, aportes y retiros trazables, cancelación y permisos; integrarlas en respaldo/restauración.
4. Regresión completa/CI, publicar y revisar cada entrega. La Etapa 11 sigue abierta hasta completar estos criterios.

Las pruebas usan datos sintéticos; no se modifican fondos reales. Sin merge ni despliegue de producción.
