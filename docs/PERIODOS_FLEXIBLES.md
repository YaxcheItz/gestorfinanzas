# Periodos flexibles — entrega funcional

Etapa 1 de `PLAN_CONTINUACION_MONAI.md`. Rama `mejoras/periodos-flexibles`, creada desde `develop` y `origin/develop` comprobados en `f2b4cdf98357f29944ef94350ef65fd90270cf4f`. Cambios locales; sin commit, push ni despliegue.

## Comportamiento

- Inicio conserva una consulta temporal independiente de la preferencia del usuario. La casilla **Usar al abrir Inicio** guarda el ciclo en su perfil; aplicar sin marcar sólo cambia la consulta. Un rango personalizado siempre es temporal.
- Semana: bloques de siete días desde una fecha de anclaje. Por defecto, lunes a domingo; no significa los últimos siete días móviles.
- Cada 14 días: bloques continuos desde el anclaje, también para fechas anteriores. No se reinician al cambiar de mes o año.
- Quincena: dos inicios por mes elegidos por el usuario. Primero entre 1 y 27; segundo mayor que el primero y hasta 31. Así ambos siguen siendo distintos incluso en febrero. Predeterminado: 1 y 16.
- Mes: empieza el día elegido, entre 1 y 31; termina el día anterior al siguiente inicio. Si no existe el día, se ajusta al último del mes sin cambiar la elección original. Un ciclo que empieza el 31 de enero de 2024 termina el 28 de febrero; el siguiente empieza el 29 de febrero y termina el 30 de marzo.
- Año: enero a diciembre. Hoy: un día civil. Todo el historial: dominio de fechas soportado, 2000-01-01 a 2100-12-31; sus flechas se desactivan. Rango libre: fechas existentes, ordenadas y no posteriores a hoy.
- Todos los extremos son inclusivos. El día financiero se calcula en `America/Mexico_City`, como el backend existente. UTC se usa únicamente para hacer aritmética de fechas civiles sin cambios de horario; no se convierten las fechas de las operaciones.
- Las flechas y el gesto horizontal mantienen el tipo de ciclo. No permiten avanzar a un ciclo aún no iniciado; un ciclo en curso sí incluye su fecha final. En rangos libres se desplaza la misma cantidad inclusiva de días, sin superar hoy.

## Consistencia de cifras

Resumen, barras y recientes reciben las mismas fechas. **Ver todos** y tocar una categoría conservan el rango al abrir el historial. El historial mantiene sus filtros, paginación y separación de monedas.

En Inicio detallado, **Informe del periodo** envía el rango y su ciclo anterior real a Reportes. Los rangos libres se comparan con el tramo inmediatamente anterior de igual número de días. Todo el historial y el primer ciclo consultable no inventan una comparación anterior. Entrar directamente a Reportes conserva su consulta mensual, identificada como **Mes**.

Los presupuestos siguen siendo mensuales. Se muestra el mes donde empieza el rango, explícitamente etiquetado; para todo el historial se usa el mes vigente. El presupuesto sólo se asocia a una barra de gasto cuando la consulta es un mes calendario completo. No se presentan límites mensuales como si fueran límites de una catorcena o de un año.

## Contrato y persistencia

- `GET /api/dashboard/periodo`: resuelve `tipo`, `ancla`, `diaInicio`, `diaQuincena` y `referencia` opcional; devuelve `desde` y `hasta`. Requiere sesión.
- `PUT /api/perfil/periodo`: guarda únicamente la configuración del usuario autenticado. No acepta un usuario destino. El perfil devuelve `periodoPredeterminado`.
- Configuración de ejemplo: `{"tipo":"CATORCENA","ancla":"2026-01-05","diaInicio":1,"diaQuincena":16}`.
- Resumen y analítica conservan los parámetros `desde`/`hasta`; la comparación los admite junto con `desdeAnterior`/`hastaAnterior`. Rechaza rangos incompletos, invertidos y comparaciones solapadas. Sin anterior explícito, un rango libre usa el tramo anterior de igual duración.
- Java y TypeScript usan los mismos 18 ejemplos de contrato en `backend/src/test/resources/periodos.json`, más pruebas de navegación, validación, límites y zona horaria. El cliente calcula el calendario sin requerir una petición para cada toque; las consultas y la preferencia se validan en servidor.
- Flyway `V4__periodo_predeterminado.sql`: cuatro columnas con valores predeterminados y restricciones. Los usuarios actuales continúan en mes calendario. No se cambian movimientos, importes ni fechas de tarjetas.
- Si falla el guardado, se muestra el error y se permite reintentar; no se anuncia una preferencia guardada. Las respuestas de otra sesión se descartan. El guardado requiere conexión y un perfil cargado; no se añadió una cola offline de preferencias.

## Verificación

Resultados y alcance en `replica/periodos-flexibles/verification.json`. Backend probado con PostgreSQL 17 y Flyway habilitado en esquema aislado; E2E en base local dedicada a pruebas y otro esquema aislado. Los tests de migración comprueban actualización V1→V4 con datos, valores iniciales, restricciones, repetición sin cambios, rollback de una V5 fallida y detección de checksum alterado.

El backend local de 18081 se actualizó después de crear un respaldo privado legible en `.local/periodos-antes-v4.private.dump`. Frontend 4300 y servidor 14200 conservados. No se conectó a producción. No hay certificación en Android físico ni porcentaje de cobertura medido.

## Cómo probarlo

1. Abrir Inicio en 4300 y tocar el periodo bajo el importe.
2. Elegir cada 14 días y una fecha de anclaje; aplicar sin la casilla y recorrer ciclos con las flechas.
3. Abrir nuevamente la hoja, marcar **Usar al abrir Inicio**, aplicar y recargar: se conserva la configuración.
4. Consultar un rango personalizado con movimientos conocidos; comprobar importe, barras y **Ver todos**.
5. Cambiar a vista Detallada y abrir **Informe del periodo**; comprobar fechas, importes y comparación anterior.

## Continuación

Integrar esta entrega en develop y volver a comprobar el remoto antes de crear `mejoras/listas-etiquetas`. La etapa siguiente es listas y etiquetas, migrando los movimientos existentes a Personal sin alterar cuentas, propietarios ni importes. La validación física de Android del cierre visual sigue pendiente y puede hacerse antes de integrar.
