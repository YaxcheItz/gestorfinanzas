# Chat: espacio de revisión, editor y errores — 11 noviembre 2026

Implementación local en rama `mejoras/chat-visual-espacio-error`, worktree `.local/worktrees/chat-visual-ajustes`, desde `origin/develop` comprobado `74a85bb60a7301e38198fa7245d817d57d85f82b`. Solicitud “sigue” continúa la propuesta de la primera sección. Checkout principal y sus cambios previos conservados.

## Cambios
- Apertura inicial compacta conservada; conversación móvil pasa de máximo30rem a44rem, limitado al viewport visible.
- Error de captura fuera del hilo desplazable, junto al compositor, manteniendo role alert; conserva texto para reintentar, sin enviar automáticamente.
- Acciones de propuesta permiten apilarse, mínimo44px y sin dividir palabras como Descartar.
- Editor ocupa el espacio restante. Solo campos se desplazan; cancelar/actualizar y explicación permanecen visibles. Se oculta el acceso manual redundante durante edición.
- Acceso manual rotulado Registro manual; selectores E2E existentes adaptados al nombre. No cambia operaciones, confirmación, motor local/Groq, voz, cuentas ni MSI.

## Verificación
- Build Angular aprobado. Persisten dos avisos previos de presupuesto CSS en avisos.component.css y automatic-bank.css.
- Pruebas del componente:71 aprobadas. Suite frontend completa:65 archivos,569 pruebas aprobadas.
- QA Chromium con API ficticia y red externa bloqueada: error503 visible sin desplazar, acciones>=44px, editor con actualización dentro del viewport, texto conservado al cerrar/reabrir y vacío tras recargar. Tamaños320x640,390x480,390x844 oscuro y1280x800.
- Prueba reproducible: `node node_modules/@playwright/test/cli.js test --config=playwright.chat-visual.config.ts`, después de `npm run build`, desde frontend del worktree. Solo respuestas sintéticas; no requiere backend. Evidencias de ejecución en frontend/test-results; copias iniciales en .local/chat-change-qa del principal. Se inspeccionaron capturas de propuesta, editor, error, oscuro y escritorio.
- Los E2E que solo cambian el rótulo no se ejecutaron contra backend; la suite unitaria no prueba esos recorridos completos. No hay medición nueva de cobertura/lint global ni auditoría integral de seguridad.

## Límites y siguiente sección
Sin instalación, publicación, push, PR ni cambios en sesiones reales. No se generó APK. Android físico/teclado real y aceptación visual siguen pendientes;390x480 es solo una prueba geométrica. El tamaño ampliado y la prioridad de acciones deben validarse con el usuario. Se conservan calendario, historial aplazado y ausencia de borradores persistentes; PR271 no integrado.
Siguiente: revisar/proponer controles flotantes y texto ampliado por sección. No implementar un rediseño global.

## Continuación
Continúa Kaptal desde `.local/worktrees/chat-visual-ajustes`, rama `mejoras/chat-visual-espacio-error`. Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/CHAT_VISUAL_IMPLEMENTACION_2026-11-11.md. Chat ajustado y probado localmente; pendiente aceptación/Android físico y cualquier entrega. Siguiente sección: controles flotantes y texto ampliado. Conserva cambios previos del principal y no publiques/instales sin nueva instrucción.
