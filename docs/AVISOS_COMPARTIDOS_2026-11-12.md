# Avisos Android y gastos en pareja — 12 noviembre 2026

## Rama y alcance
Rama mejoras/avisos-compartidos-visual creada desde origin/develop74a85bb comprobado y adelantada por fast-forward a origin/mejoras/navegacion-detalles fdcb20a como dependencia. Mantiene la historia anterior sin nuevos cherry-picks. Principal limpio al iniciar; datos/sesiones reales intactos.
Se aplicó diagnóstico móvil y cambios mínimos de disposición. Puente Android y API totalmente ficticios, con red externa bloqueada. No se abrió la app real ni se instalaron APKs.

## Hallazgos y cambios
- Registro automático: contadores en tres columnas partían Pendientes/Registrados en grupos de letras con raíz200%. La cuadrícula ahora usa columnas adaptativas con ancho mínimo, y se apila cuando falta espacio.
- Gastos en pareja: resumen con nombres largos y movimientos poblados desbordaba el viewport; nombres quedaban truncados/columnas muy estrechas. Se ajustan mínimos de cuadrícula y envoltura, y las filas móviles se apilan con acciones que pueden envolver.
- Formulario de pareja: faltaba límite de altura/desplazamiento, y las acciones podían quedar fuera del viewport. Se limita a100dvh-1.5rem, se desplaza internamente y las acciones se apilan. Se conecta focusTrapEscape a cerrar y se añade tabindex=-1.
- No se cambian cálculos, validaciones, consentimiento, asociaciones, permisos, recepción/registro automático, idempotencia ni datos de ningún usuario.

## Comprobación
Build final aprobado: sigue el aviso de Avisos4.49kB/4kB; automatic-bank.css pasa de aproximadamente4.99 a5.01kB/4kB por la regla adaptativa. No ocultar el aviso ni aumentar el presupuesto artificialmente.
Suite frontend569 pruebas aprobadas.7 E2E existentes de Avisos aprobados (edición de asociación conservando reglas, recepción, privacidad, claro/oscuro y recuperación sintéticas).2 E2E nuevos aprobados: bandeja/asociaciones/formulario Android simulado, pareja vacía/poblada/error, sin escrituras y con Escape. Tras el último ajuste solo de estilo de resumen se repitieron build y los2 E2E nuevos.
La prueba comprueba ancho del documento320px con raíz200%, columna única de métricas y cierre del diálogo. Se inspeccionaron capturas antes/después de asociaciones, avisos, formulario de aviso, pareja poblada y acciones del formulario. Algunos importes grandes del resumen aún saltan de línea al ampliar texto; no se afirma legibilidad perfecta ni conformidad WCAG.
Reproducir: npm run build; node node_modules/@playwright/test/cli.js test --config=playwright.avisos-compartidos.config.ts. Suite anterior: --config=playwright.avisos-ui.config.ts. Evidencias locales frontend/test-results/avisos-compartidos-local-*. No subir datos reales.

## Límites y siguientes secciones
Las fixtures prueban interfaz, no compatibilidad bancaria universal, registro real, concurrencia, backend ni exactitud contable. No se prueban aceptación de invitación real, enlaces/listas compartidas ni sincronización entre usuarios. Pendientes: listas compartidas e invitaciones con fixtures, contraste medido, foco/TalkBack y teclado físico Android. Conservar calendario, historial aplazado, reglas/Groq e inexistencia de borradores persistentes; PR271 obsoleto.
Sin integración a develop/main, despliegue, instalación ni APK. Subir esta rama y verificar SHA remoto antes de declararla publicada; CI remota es otra comprobación.

Continuación: leer AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y este documento. Worktree .local/worktrees/avisos-compartidos, rama mejoras/avisos-compartidos-visual. Siguiente: selector/listas compartidas e invitaciones; medir contraste y revisar saltos de línea de importes grandes. Confirmar/subir cada parte; no instalar/publicar producción automáticamente.
