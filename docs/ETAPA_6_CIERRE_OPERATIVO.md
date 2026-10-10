# Cierre operativo de etapa 6

Fecha: 8 de octubre de 2026. Rama: `mejoras/etapa-6-cierre-operativo`, desde develop `e1e3189`.

## Estado comprobado

- Develop local/remoto: `e1e318957527acfbbc88730813496a691dd23f14`.
- Main local/remoto: `77a4511958ef642ef480ddef7257ff3526519215`. Ambos árboles coinciden.
- CI develop y main: backend, frontend, PostgreSQL/recuperación y E2E correctos. [CI main](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/37854157144).
- Main activó Vercel y Render automáticamente. Vercel terminó correctamente; Render falló. No considerar el health de una instancia anterior como evidencia del nuevo despliegue.
- El log aportado confirma: `finanzas` no está vacío y carece de `flyway_schema_history`. El usuario confirmó que Render usa la base Supabase de `backend/.env`.

## Copia real y ensayo

Se exportó únicamente `finanzas` mediante una transacción explícita `REPEATABLE READ READ ONLY` y snapshot exportado compartido con `pg_dump`. Se comprobó `transaction_read_only=on`; no se confió en PGOPTIONS, que el proveedor no aplicó en la comprobación inicial.

El dump y los informes completos están en `.local/etapa6-cierre-operativo/`, excluidos de Git y con ACL restringida al usuario y SYSTEM. No compartirlos: contienen datos de autenticación y financieros. Se restauró en una base nueva local `kaptal_restore_cierre_operativo`: 18 tablas; hashes de filas, secuencias, columnas, índices y restricciones coinciden con el origen capturado.

La copia no representa un backup completo de Supabase: no incluye esquemas gestionados, roles, propietarios ni grants. Las secuencias no usan MVCC; actividad concurrente puede generar discrepancias. RPO/RTO y restauración en infraestructura del proveedor siguen pendientes.

La comparación contra V1+V2 encontró:

1. CHECK de `categorias.tipo` sin `SALDO_INICIAL`.
2. `cuentas.moneda` sin default `MXN`.
3. Diferencias de orden físico de columnas y nombres de índices, sin diferencias de comportamiento restantes.

La comparación semántica ignora solamente orden físico y nombre de índice; conserva tipos, defaults, nulabilidad, precisión, unicidad, método, expresión, predicado y restricciones. Dos pruebas nuevas comprueban que no oculta cambios de tipo/default/unicidad/predicado; junto con tres pruebas de CHECK, pasan cinco pruebas Python.

`scripts/adopt-observed-schema.sql` corrige exactamente las dos diferencias reales, con guardas que rechazan un CHECK/default desconocido, transacción y límites de bloqueo. No toca importes, filas, consentimiento ni autoría. No modifica V1/V2 ya publicadas. Se aplicó únicamente a la copia; después el esquema coincide con V2.

`scripts/LocalFlywayAdoption.java` acepta exclusivamente una copia en 127.0.0.1:15432. Reproduce el rechazo inicial, registra baseline explícito 2, valida y comprueba que no se vuelvan a ejecutar V1/V2. El ensayo pasó. Baseline por sí solo no prueba equivalencia: la comparación anterior es obligatoria. [Flyway baseline](https://documentation.red-gate.com/flyway/reference/commands/baseline).

La auditoría histórica sobre la copia terminó con exit 0: cero MSI incompletos, cero cuentas con retención discrepante, cero vínculos activos sin consentimiento registrado y cero pagos sin autor conocido. Esto verifica los controles incluidos en el SQL; no certifica todos los movimientos frente a estados de cuenta externos.

Tras el ajuste y baseline, hashes de las 18 tablas originales y secuencias permanecen iguales. El historial de Flyway nuevo se excluye solamente de esa comparación de datos.

El contexto Spring Boot arrancó sobre la copia con Flyway habilitado e Hibernate `validate`: `BackendApplicationTests`, una prueba, cero fallos. No se ejecutó la suite que crea o borra fixtures sobre datos reales.

## Reproducción local

Instalar `scripts/requirements-operations.txt` en un entorno privado. Configurar PG_BIN con PostgreSQL 17. Mantener el cluster de prueba ligado a 127.0.0.1:15432 y comprobar que el destino no existe. Antes de capturar datos reales, crear el directorio padre con ACL privada; el script no configura ACL de Windows.

```text
python scripts/capture-existing-database.py --env-file backend/.env --output <directorio-privado-nuevo> --restore kaptal_restore_<nombre-nuevo>
python scripts/compare-postgres-schema.py --reference <referencia-local-v2> --candidate <copia-local> --report <reporte-nuevo.json>
psql -X -v schema=finanzas -d <copia-local> -f scripts/audit-historical-data.sql
psql -X -v schema=finanzas -d <copia-local> -f scripts/adopt-observed-schema.sql
python scripts/compare-postgres-schema.py --reference <referencia-local-v2> --candidate <copia-local> --report <otro-reporte-nuevo.json>
java --class-path <dependencias-backend> scripts/LocalFlywayAdoption.java <copia-local>
```

Las credenciales del origen se leen del archivo ignorado y se pasan a pg_dump mediante el entorno del proceso. Nunca incluirlas en argumentos, logs públicos o commits. El destino del script está fijado a localhost; no acepta restaurar sobre producción.

## Acción pendiente sobre producción

El plan vigente no autoriza modificar producción ni desplegar. La respuesta del usuario sobre la misma base confirma el destino, no revoca ese límite.

Para recuperar Render se necesita autorización específica para: renovar el respaldo/verificar ausencia de cambios inesperados; ejecutar los dos ajustes revisados; comparar nuevamente; registrar baseline explícito 2 usando Flyway con el artefacto actual y baseline automático desactivado; validar y reintentar el despliegue fallido de Render. No ejecutar suites de pruebas contra producción. Revisar también que Render no sobrescriba Hibernate `validate` con el antiguo `update` de `.env`.

Antes del paso real, comprobar permisos del rol de ejecución y preparar rollback del código anterior, conservando los cambios de esquema y el historial. El backup verificado y el SQL revisable están preparados; los grants del proveedor, permisos y configuración efectiva de Render requieren comprobación. No hay acceso al panel/API de Render en esta sesión.

Hasta completar y verificar ese paso, etapa 6 sigue abierta. No iniciar Wallet en esta rama ni presentar el nuevo backend como publicado.

Referencias: [snapshots PostgreSQL](https://www.postgresql.org/docs/17/functions-admin.html), [transacciones Psycopg](https://www.psycopg.org/psycopg3/docs/basic/transactions.html).
