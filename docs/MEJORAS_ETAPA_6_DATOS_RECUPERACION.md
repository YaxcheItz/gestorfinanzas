# Etapa 6: datos, recuperación y CI

Fecha: 8 de octubre de 2026. Rama: `mejoras/etapa-6-datos-recuperacion`.
Base confirmada por fetch: `develop` = `origin/develop` = `ca59493`, merge del resguardo de etapas 1–5.

## Resultado y alcance

Implementación y comprobaciones locales listas para revisión. No se ha publicado, adoptado una base real ni conciliado datos de producción. La publicación sigue bloqueada hasta revisar el esquema real, los MSI históricos y el consentimiento anterior.

- Flyway gestiona migraciones versionadas; Hibernate valida y deja de alterar el esquema automáticamente.
- V1 contiene el esquema de entidades de etapas 1–3; V2 añade propuestas persistentes, huella offline y cuenta opcional. V1 se obtuvo desde las entidades actuales excluyendo las dos adiciones de etapas 4–5; no es un dump de producción ni garantiza que una base real coincida.
- Baseline automático deshabilitado, limpieza deshabilitada y checksum validado al migrar. Bases desconocidas sin historial se rechazan.
- El runner antiguo de reparación de cuenta opcional queda opt-in para diagnósticos; el arranque normal usa V2. Sus pruebas usan un esquema aislado.
- H2 conserva el perfil rápido. PostgreSQL ejecuta las mismas suites sobre migraciones reales y `ddl-auto: validate`; las pruebas JPA ya no sustituyen silenciosamente PostgreSQL por H2.
- Dos pruebas de concurrencia limpiaban sus datos solo indirectamente al reconstruir H2. Ahora eliminan exclusivamente sus fixtures confirmados; las regresiones de borrado no reciben cuentas de suites anteriores.
- Recuperación operativa comprobada con `pg_dump` y `pg_restore` a una base nueva. El script rechaza destinos existentes y no usa `--clean`, no borra bases ni imprime credenciales.
- Comparación de esquema de solo lectura para revisar una copia antes de adoptar Flyway. Excluye el historial de Flyway y el avance de secuencias; no hace baseline.
- Control histórico de solo lectura identifica MSI incompletos, diferencia de retención y vínculos activos sin aceptación conocida. Devuelve exit 3 para bloquear publicación; no cambia saldos, importes ni autoría.
- `/api/health` comprueba conexión válida a la base y devuelve 503 ante fallo, sin publicar detalles de conexión. Ya no declara UP únicamente porque el proceso responde.
- Política de retención en este bloque: conservar propuestas/resultados persistentes hasta eliminar la cuenta. No se añade purga por antigüedad que rompa reintentos. Una política temporal futura necesita preservar tombstones/resultados de idempotencia y aprobación de producto.

## Comprobaciones locales

| Comprobación | Resultado |
|---|---|
| Backend PostgreSQL 17.9 | 304 pruebas / 44 suites, sin fallos, errores ni omitidas; verify y empaquetado correctos |
| Backend H2 | 301 ejecutadas, sin fallos; 3 pruebas exclusivas de migración PostgreSQL omitidas intencionalmente (304 descubiertas) |
| Angular | 229 pruebas / 27 archivos; build producción exit 0 |
| E2E Chromium con Angular/API/PostgreSQL reales | 3 escenarios pasan: propuesta tras recarga y reintento sin duplicar, descarte sin efecto financiero, ingreso/transferencia y restauración financiera entre usuarios |
| Recuperación operativa | 19 tablas coinciden: conteos/hashes de filas, secuencias, columnas, índices y restricciones; incluye fixture MSI de 33.33 pagados / 66.67 pendientes y propuesta completada |
| Base restaurada | Contexto Spring arranca y valida el esquema con Flyway/Hibernate; una prueba pasa |
| Rollback de aplicación | Código anterior `ca59493`, checkout separado, sobre el esquema migrado con `validate`: 57 pruebas de chat, sesiones, MSI y consentimiento pasan |
| Migraciones | V1→V2 preserva datos, reejecutar es no-op, migración fallida revierte DDL, checksum cambiado se rechaza y base desconocida no se adopta |
| Preflight de esquema | Referencia/copia coinciden; columna inesperada produce rechazo (exit 1) |
| Control histórico | Fixture correcto exit 0; MSI con pendiente desconocido exit 3. Ambas pruebas sobre datos sintéticos |
| Comparación de CHECK | Tres pruebas Python: casts equivalentes de pg_dump, valores/columnas distintos y otras restricciones sin normalización |
| CI | YAML analizado: cuatro jobs. Ejecución remota pendiente; no se confunde validación local con GitHub Actions |

Bundle sigue en 638.64 kB / presupuesto 500 kB; login CSS excede 4 kB por un byte. No se aumentaron presupuestos. Sin cobertura porcentual medida ni lint global configurado.

Entorno local: Java 23.0.2 (proyecto compila con objetivo Java 21), Node 24.10.0 y PostgreSQL 17.9. CI declara Java 21 y Node 22; la equivalencia completa se comprobará en la ejecución remota. Los checks de YAML locales no ejecutan GitHub Actions ni prueban instalación PGDG en su runner Linux.

### E2E y límites de cobertura

El comando backend funciona en Windows y Linux. E2E acepta H2 en memoria o PostgreSQL en loopback con nombre `kaptal_*_e2e`; rechaza host remoto, base común y parámetros de conexión adicionales. Mantiene servidores propios y evita reutilizar una instancia existente.

Durante preparación se corrigió la codificación de comentarios de V1/V2 tras aplicarlos a fixtures privados. Flyway rechazó después sus checksums, como debía. Se crearon bases de ensayo nuevas para verificar los archivos definitivos; no se usó repair ni se desactivó validación. Los scripts no se han aplicado a una base compartida y no se deberán editar tras su adopción.

`frontend/e2e/finanzas.spec.ts` conserva una prueba histórica extensa con selectores, colores y flujos anteriores al rediseño y al chat. Se excluye explícitamente del runner vigente; no se presenta como prueba pasada. La suite nueva cubre los tres escenarios descritos, no todos los recorridos de administración de la suite histórica. Las unitarias y suites backend se mantienen.

En la prueba ampliada, dos nombres compartían la palabra E2E y el motor pidió aclaración de cuenta. Se cambió el fixture de destino a `Reserva` para usar nombres inequívocos. No se cambió el parser; las cuentas ambiguas siguen requiriendo aclaración.

## CI y prevención de despliegues

`.github/workflows/ci.yml` ejecuta backend H2, frontend unitarias/build, backend PostgreSQL con recuperación y E2E con PostgreSQL. Escucha pushes a `main`, `develop`, `mejoras/**` y PR hacia main/develop. No incluye pasos de despliegue. Concurrencia cancela ejecuciones obsoletas de la misma referencia.

PostgreSQL 17 corre como servicio aislado por job; las credenciales de CI son sintéticas. Cliente 17 desde repositorio oficial PGDG. Recuperación sube únicamente verification.json; no sube dumps. Las trazas de fallo E2E pueden contener tokens de los usuarios sintéticos de prueba, conservados siete días.

Vercel excluye específicamente esta rama mediante `git.deploymentEnabled`, conservando la exclusión del resguardo anterior. Render declara main. No se consultaron paneles externos ni se cambió hosting. No hubo push en esta etapa; la ejecución remota de CI queda por comprobar cuando se suba la rama.

## Adopción de una base existente

1. Identificar proveedor, versión PostgreSQL, esquema, roles, extensiones y versión de código real. Congelar escrituras durante el ensayo de comparación de datos. Obtener respaldo fuera de Git y comprobar restauración en base nueva.
2. Ensayar sobre la copia, nunca sobre producción. Crear otra referencia vacía y aplicar V1 o V1+V2 según el estado que se pretende adoptar.
3. Usar `scripts/compare-postgres-schema.py --reference <referencia> --candidate <copia> --schema finanzas --report <archivo-nuevo.json>` con PGHOST/PGPORT/PGUSER y PGPASSFILE. El mismo nombre de esquema debe existir en ambas bases. La comparación se limita al esquema seleccionado (finanzas por defecto), sin asumir que los esquemas auxiliares del proveedor forman parte de Kaptal. Rechazar diferencias; no eliminarlas a ciegas ni activar baseline automático.
4. Si la copia coincide con V1 y no contiene propuestas/huella, hacer baseline **explícito en versión 1** y ejecutar V2. Si coincide completamente con V2 por modificaciones anteriores de Hibernate, hacer baseline **explícito en versión 2**. Registrar versión, respaldo, fingerprint, fecha y responsable. Baseline no aplica ni verifica por sí mismo los scripts excluidos: la comparación previa es obligatoria.
5. Una base anterior a etapas 1–3 no queda cubierta por un baseline inventado. Preparar migración de adopción adicional con el esquema observado y revisar los SQL históricos; conservar nulos de datos desconocidos. No usar `IF NOT EXISTS` como prueba de que la columna, FK o índice correctos ya existen.
6. Levantar la copia con el nuevo artefacto, Flyway y `validate`. Ejecutar flujos financieros, reintentos, concurrencia y restauración. Resolver MSI/vínculos con sus fuentes originales antes de publicar.

Los scripts versionados no se editan después de aplicarlos a una base compartida. Cada corrección futura necesita nueva versión; `repair` no sustituye investigación de un checksum diferente.

## Respaldo y restauración

El respaldo financiero JSON por usuario preserva finanzas y mantiene perfil/contraseña del destinatario; no contiene sesiones, esquema ni pendientes de chat. El respaldo operativo PostgreSQL sí incluye esos datos y es sensible. No intercambiar ambos como si ofrecieran la misma recuperación.

Configurar PGHOST, PGPORT, PGUSER y PGPASSFILE; PG_BIN es opcional si las herramientas están en PATH. Elegir cliente de la misma versión mayor del servidor o compatible, no exponer contraseñas en comandos ni URLs. Para una prueba con escrituras detenidas:

```text
python scripts/verify-postgres-recovery.py --source <base-origen> --restore kaptal_restore_<identificador> --output <directorio-nuevo-fuera-de-git>
```

El destino y directorio deben ser nuevos. Un fallo conserva dump y base para diagnóstico. El script compara contenido, secuencias y estructura; calcula SHA-256 del archivo y hashes MD5 de filas para comparación accidental, no como protección criptográfica de datos individuales. PostgreSQL reescribe los casts de algunos CHECK de enum al restaurar: se normaliza únicamente esa forma exacta, conservando columna y valores permitidos. Otras restricciones se comparan literalmente.

La comprobación exige ausencia de escrituras concurrentes porque el manifiesto y pg_dump no comparten snapshot. Un backup operativo con tráfico requiere diseñar snapshot consistente o aceptar/reconciliar el punto temporal del dump. No copia roles externos, propietarios/grants efectivos, extensiones del proveedor ni configuración de servidor. Reaplicar permisos mínimos y probarlos antes de habilitar tráfico. En Linux el directorio se crea con modo 0700; en Windows verificar ACL del destino y cifrado del volumen. No se añadió cifrado propio del dump ni copia externa automática.

No se automatiza borrado de los archivos de respaldo. Los dumps locales quedan bajo `.local/`, ignorada por Git; su retención debe gestionarse conscientemente. Para producción falta medir duración, RPO/RTO y frecuencia de respaldo en la infraestructura elegida.

## Rollback y observación

- Rollback de aplicación: volver al artefacto anterior **manteniendo el esquema aditivo y usando `validate`**. No retirar columnas/tablas de propuestas ni huellas. La comprobación local usó `ca59493`, con 57 pruebas PostgreSQL; no equivale a haber desplegado y revertido el servicio real.
- Una migración V2 fallida revierte su transacción PostgreSQL. Revisar locks/timeout/errores antes de reintentar. No continuar arranque tras un fallo de migración ni esconderlo con un runner que capture el error.
- Rollback de datos: detener escrituras, restaurar a base nueva, validar estructura/datos/roles y cambiar conexión después de comprobaciones. Cambiar la conexión no debe ejecutarse automáticamente. Restaurar un punto anterior puede perder escrituras posteriores; requiere plan de reconciliación e idempotencia, no un DROP del esquema nuevo.
- Mantener readiness `/api/health`, vigilar errores de arranque Flyway, fallos de pruebas CI y verificaciones de recuperación. Frecuencia de alertas, almacenamiento externo y monitorización del proveedor se definen al estabilizar hosting; no se probaron alarmas reales.

Readiness espera hasta dos segundos de validación JDBC, además del tiempo para obtener una conexión del pool (máximo configurado 20 segundos). No distingue degradación de proveedor, colas o espacio en disco. El código previo usado para rollback tenía health sin comprobación de base; su monitorización requiere considerar esa diferencia.

## Conciliación histórica y bloqueo de publicación

Ejecutar en la copia con el nombre de esquema correcto:

```text
psql -X -v ON_ERROR_STOP=1 -v schema=finanzas -d <copia> -f scripts/audit-historical-data.sql
```

Exit 3 significa que faltan datos/conformidad. El control no prueba todo el libro diario ni reconstruye totales originales. Incluso exit 0 requiere revisar fuentes y conciliación contable. MSI sin original/vínculo requieren documento verificable y decisión explícita; no inferir por descripción. Vínculos anteriores sin fecha deben renovar consentimiento, no asignar una fecha falsa. Pagos sin autor conocido conservan solo lectura.

No se tiene copia de producción ni documentos originales en esta sesión. La conciliación real y adopción real están pendientes y bloquean publicación. No se modificaron saldos reales.

## Evidencia y continuidad

Evidencias finales: `replica/mejoras-etapa6/`. Pruebas, scripts y configuración se mantienen en fuentes. Los intentos de ajuste no se presentan como exitosos; usar los logs finales y `verification.json`.

Tras las comprobaciones se detuvo exclusivamente el cluster temporal creado para esta tarea y se retiró el worktree del rollback. Se conservaron bases sintéticas bajo TEMP y dumps privados bajo `.local/`; ningún servicio de producción se detuvo.

Cada etapa se trabaja en rama distinta, según nueva preferencia del usuario guardada en AGENTS.md. Esta rama solo contiene etapa 6. Siguiente prioridad del plan: viabilidad de Wallet y decisión móvil, tras revisión de este resultado y en otra rama. No se inicia aquí.

Referencias oficiales consultadas: [Spring Boot/Flyway](https://docs.spring.io/spring-boot/how-to/data-initialization.html), [baseline explícito](https://documentation.red-gate.com/flyway/reference/commands/baseline), [baseline automático](https://documentation.red-gate.com/flyway/reference/configuration/flyway-namespace/flyway-baseline-on-migrate-setting), [cliente PostgreSQL/Ubuntu](https://www.postgresql.org/download/linux/ubuntu/).
