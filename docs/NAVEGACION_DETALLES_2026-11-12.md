# Navegación y detalle de presupuestos — 12 noviembre 2026

## Git y preferencias
- Principal: todos los cambios de proyecto pendientes confirmados; ajuste AGENTS.md y eliminación de la guía OpenCode en5b44208, subido y hash remoto verificado. error.log es salida local de ejecución de herramienta, conservado e ignorado mediante /error.log; no contiene cambios de aplicación y no se publicó.
- Reintentos exitosos: respaldo/documentos-checkout-20261111 actualizado hasta5b44208 y mejoras/formularios-cuentas-presupuestos hasta183e4a0. Verificados mediante ls-remote. El bloqueo anterior de GitHub no seguía vigente al comprobar.
- Preferencia explícita registrada en AGENTS.md y nota de memoria solicitada: confirmar/subir cada etapa por ramas, verificar remoto y reintentar fallos. No equivale a integrar main ni desplegar producción.

## Rama y cambios
Nueva rama mejoras/navegacion-detalles desde origin/develop74a85bb. Dependencias de etapas previas incorporadas mediante cherry-pick237be17,f943ce4,1ea2656,12acd57,d111f1d y preferenciasa835394. No se cambió directamente develop.
Se verificó cuenta->historial: URL y consulta usan cuentaId11 ficticio. Detalle de presupuesto->Modificar límite conserva123456.78 ficticio. Escape cierra el detalle. No se confirmó ni guardó operación.
Defectos visuales observados: resumen de montos recortado y columna de cuenta extremadamente estrecha a320px y fuente raíz200%. Cambios limitados al detalle: totales en columnas adaptativas y padding contenido, filas de movimientos apiladas en estrecho, descripción completa con ajuste de línea, acciones flexibles>=44px y error de carga con role alert. Sin cambiar importes, cálculos, filtros ni motor financiero.

## Evidencia y comprobaciones
Build final aprobado; avisos CSS preexistentes en Avisos y automatic-bank.569 pruebas frontend aprobadas; después del último ajuste de padding se repitieron build y E2E visual. E2E1 aprobado con datos sintéticos poblados: navegación filtrada desde Cuentas, detalle, ausencia de overflow en resumen/descripción, edición prellenada y cierre por Escape.390px claro/oscuro y320px con fuente200%. Capturas revisadas antes/después; los tres importes de prueba se leen completos tras el ajuste.
Reproducir: npm run build y `node node_modules/@playwright/test/cli.js test --config=playwright.navegacion-detalles.config.ts` desde frontend del worktree. API sustituida y tráfico externo bloqueado; las escrituras abortan la prueba. Evidencia en frontend/test-results/navegacion-detalles-local--b774a--permite-consultar-y-editar. No guardar capturas/datos financieros reales en el repositorio.
No se certifican TalkBack, teclado físico, WCAG completa, importes de longitud ilimitada ni servidor real. La revisión de historial sigue limitada a defectos/navegación; no se rediseñó. Calendario conservado. No se creó APK, instaló, desplegó ni integró a develop/main.

## Continuar
Leer AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y este documento; worktree .local/worktrees/navegacion-detalles. Comprobar Git/CI/remote exactos antes de asumir. Siguiente: avisos y espacios compartidos con fixtures completas, y contraste/foco pendientes por sección. Mantener sesión/datos reales intactos, reglas/Groq/idempotencia, calendario y ausencia de borradores persistentes; PR271 obsoleto.
