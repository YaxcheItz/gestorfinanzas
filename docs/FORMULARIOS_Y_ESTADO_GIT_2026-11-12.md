# Formularios de Cuentas y Presupuestos y estado Git — 12 noviembre 2026

## Cambios sin commit encontrados
El checkout principal estaba en correcciones/guia-gesto-categorias, HEAD388d9d4. docs/ESTADO_SESION.md y docs/PLAN_MAESTRO_KAPTAL.md tenían1017 líneas agregadas cada uno;2034 líneas de documentación acumulada explican el contador. No eran cambios de implementación pendientes del chat/controles: estos estaban confirmados en sus ramas remotas.
Se preservaron íntegros ambos documentos y cinco informes en rama de respaldo documental `respaldo/documentos-checkout-20261111`, commitf6fc908. Push exitoso. Rama de archivo creada desde el checkout antiguo para conservar el contenido sin sustituirlo; no es una rama de implementación ni debe integrarse indiscriminadamente sobre develop. No se eliminaron entradas históricas ni se deduplicaron decisiones anteriores.
Se mantienen aparte tres cambios preexistentes: AGENTS.md modificado3+/2-, INSTALACION_COMPLETA_OPENCODE.md eliminado42 líneas y error.log sin seguimiento. No son parte del trabajo visual actual; no se leyeron/comprometieron datos del log.

## Etapa actual
Rama nueva `mejoras/formularios-cuentas-presupuestos`, worktree .local/worktrees/formularios-cuentas-presupuestos, desde develop74a85bb con las mejoras anteriores como dependencias explícitas mediante cherry-pick (5de735e,830eca8,ea5a57d). Sin instalación/publicación/integración.
Se recorrieron creación de cuenta de crédito y presupuesto a390px claro/oscuro y320px con raíz200%. Corte y pago quedaban en dos columnas demasiado estrechas. Se apilan a anchuras<=28rem. Presupuestos muestra errores de guardado con role alert para anunciarlos; se conservan sus validaciones y datos al fallar.
No se modifican saldo, cuenta DEBITO/Inversión, MSI, motor de registro, voz ni calendario. La reorganización general del formulario sigue pendiente de decisión, especialmente exceso de texto explicativo y nombres largos en selectores nativos.

## Verificación
Build propio final aprobado con los dos avisos CSS previos. Suite frontend:65 archivos,569 pruebas aprobadas. Playwright:1 prueba sintética aprobada, recorre/cierra los dos formularios en tres combinaciones, verifica ancho del campo corte>=100px y simula503 de presupuesto con categoría/importe válidos; alerta presente e importe2000 conservado. Todo el tráfico externo bloqueado y API sustituida; ninguna cuenta, compra o presupuesto real creado.
Comando: después de npm run build, `node node_modules/@playwright/test/cli.js test --config=playwright.formularios.config.ts` desde frontend del worktree. Evidencias en frontend/test-results/formularios-local-formular-10662-upuesto-con-datos-ficticios, no subir capturas privadas. Inspección visual de creación, corte/pago, acciones finales y presupuesto ampliado. Primera inspección reutilizó el build de controles que tenía igual frontend; verificación final usa build propio de esta rama.
No se prueba voz/backend/contabilidad, guardado exitoso real ni navegación completa a detalle/historial. Teclado físico, TalkBack, contraste y aceptación del propietario pendientes. Ningún resultado se infiere de solo compilar.

## Continuación
Leer AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y este documento. Trabajar desde .local/worktrees/formularios-cuentas-presupuestos. Próximo: revisar navegación desde cuentas y detalle de presupuestos con listas pobladas ficticias, antes de reorganizar formularios o añadir funciones. Conservar calendario, historial aplazado, ausencia de borradores persistentes y PR271 obsoleto. El checkout principal queda como respaldo documental con3 cambios preexistentes aparte; las ramas de implementación están en worktrees.
