# Resguardo de etapas 1–5

Fecha: 8 de octubre de 2026.

## Resultado

- Rama creada desde `develop` / `origin/develop`: `mejoras/etapas-1-5`.
- Base confirmada tras fetch: `2f28f3ed105d0c496a69aae704d909962816a921`. Las etapas 1–3 ya formaban parte de la base; los cambios pendientes eran principalmente las etapas 4–5 y sus evidencias.
- Commit de fuentes y evidencias: `4e7c26a8d440640f0ebe51098be4f2288ebb20d5`, subido a la misma rama.
- Autor y committer comprobados: `YaxcheItz <yaxtibla1@gmail.com>`, identidad configurada en Git. Commit sin firma y sin trailer de coautoría del asistente.
- Sin PR ni merge. Push limitado mediante refspec explícito a esta rama; no se subieron `main` ni `develop`.
- Plan actualizado en `docs/PLAN_MEJORAS_PROYECTO.md`, manteniendo los números históricos de etapa y el nuevo orden de diez prioridades.

## Revisión previa al push

- CI solo escucha pushes a `main` / `develop` y PR dirigidas a ellas. No se espera CI en esta rama sin PR; no se presenta como validación remota de los cambios.
- Keep warm solo tiene schedule y workflow_dispatch, sin activación por este push.
- `render.yaml` declara `main` como rama del backend. No se dispone de acceso al panel de Render para verificar que la configuración activa coincida con el archivo.
- Vercel no tenía exclusión de previews. Se añadió `git.deploymentEnabled["mejoras/etapas-1-5"] = false`, limitada a esta rama. La [documentación oficial](https://vercel.com/docs/project-configuration/git-configuration) confirma esa opción. El proxy existente apunta al backend de Render; por eso no se generó intencionalmente un preview conectado a él.
- Tras el primer push, la API pública de GitHub devolvió cero statuses y cero deployments para el commit. Esto describe el instante de consulta y los registros visibles en GitHub; no prueba ausencia de actividad en paneles externos ni impide despliegues manuales.

## Comprobaciones repetidas en esta sesión

- Backend: `mvnw.cmd -B verify`, compilación/empaquetado y 298 pruebas sin fallos, errores ni omitidas. H2; no PostgreSQL.
- Frontend: 229 pruebas / 27 archivos pasan con `--runner-config=../replica/navegacion-captura/vitest.config.mjs`.
- Angular producción: build exit 0. Advertencias conservadas: bundle 638.64 kB / 500 kB y CSS login excede 4 kB por un byte.
- Primer intento frontend apuntó por error a una configuración inexistente bajo etapa 5. Se corrigió la ruta y se completó la suite; no fue un fallo de aplicación.
- Diff de fuentes y diff staged sin errores de espacios, admitiendo conversión LF/CRLF.
- 95 archivos modificados/nuevos revisados mediante patrones de claves privadas, tokens GitHub/AWS y claves de proveedor. Cero coincidencias; ningún archivo mayor de 10 MiB. Esta comprobación no sustituye una auditoría completa de secretos.
- Evidencia nueva: `replica/resguardo-etapas-1-5/`. Se conservan los informes, capturas y logs históricos de etapas anteriores. Las comprobaciones de navegador de etapa 5 se revisaron como evidencia existente, sin repetirlas en este resguardo.

## Revisión inicial de etapa 6

Estado: inspección inicial, implementación y validación pendientes.

- Backend sigue con `ddl-auto: update`; los SQL de etapas 2–5 son referencias aditivas, no un historial formal de migración. Hay que obtener/contrastar el esquema real antes de baselinar una base existente; no habilitar un baseline automático que acepte cualquier esquema.
- PostgreSQL 17 y sus herramientas están instalados en `C:/Program Files/PostgreSQL/17/bin`, aunque no están en PATH. Docker está instalado, pero su motor no respondió. Puede usarse un cluster PostgreSQL aislado para pruebas; no usar bases reales.
- El perfil de pruebas usa H2 y `create-drop`. Hay que añadir ejecución PostgreSQL con migraciones y validación de esquema, incluyendo concurrencia, rollback, sesiones, propuestas, MSI y respaldo financiero.
- Playwright existente usa un comando Windows `mvnw.cmd`; requiere portabilidad para CI Linux. CI compila frontend, pero no ejecuta unitarias ni E2E.
- Distinguir respaldo financiero por usuario del respaldo operativo de PostgreSQL: el primero excluye pendientes del chat y no recupera sesiones/esquema. Comprobar dump/restauración en base aislada, conteos, restricciones y datos de prueba.
- Rollback debe preservar datos y evitar eliminar columnas/tablas nuevas durante reintentos. Verificar versión anterior contra esquema aditivo y definir restauración operativa con su posible pérdida de escrituras posteriores.
- MSI históricos sin total/vínculo original necesitan fuente verificable; no inferir importes por descripción ni cambiar saldos reales. Vínculos activos anteriores necesitan revisión de consentimiento. Ambos siguen como bloqueos de publicación.
- Retención de propuestas/resultados pendiente: no borrar claves/resultados de manera que un reintento antiguo cree un movimiento duplicado.

La prioridad 1 queda resguardada. La siguiente entrega es etapa 6; no hay autorización de despliegue ni se ha modificado producción.
