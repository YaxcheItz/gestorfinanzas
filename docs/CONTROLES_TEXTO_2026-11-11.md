# Controles y texto ampliado — 11 noviembre 2026

Rama `mejoras/controles-texto-accesible`, worktree `.local/worktrees/controles-texto`, creada desde origin/develop74a85bb e incorpora como dependencia el chat0fd3f6a mediante cherry-pick86c5ea5. No se reutilizó la rama del chat. Los cambios preexistentes del checkout principal permanecen.

## Cambios
- En pantallas secundarias, búsqueda/captura/voz tienen una fila bajo la cabecera que se desplaza con la página. Se evita la superposición del dock en Configuración, Reportes, Metas, Libro diario, Cuentas y Presupuestos. Los botones conservan sus funciones y nombres accesibles.
- Inicio y Movimientos conservan controles flotantes. Su superposición durante scroll no queda resuelta globalmente por esta parte; evaluar después con el usuario antes de alterar su composición.
- Tarjetas estrechas de cuentas colocan identificador encima del nombre y reservan ancho completo al texto. Se eliminan recortes interiores. A200% una palabra excepcionalmente larga aún puede dividirse entre líneas; no se reduce el texto ni se oculta el nombre.
- Presupuestos a anchura estrecha apila mes/año y evita ruptura arbitraria del botón Crear primer presupuesto.
- Gastos del periodo, ingresos y saldo neto en Inicio usan unidades de fuente relativas; métricas se apilan cuando necesitan más espacio. Calendario y lógica financiera sin cambios.

## Pruebas y evidencia
Build Angular final aprobado; persisten los dos avisos CSS previos de Avisos/automatic-bank. Suite frontend final:65 archivos,569 pruebas aprobadas. `git diff --check` sin errores.
Prueba `node node_modules/@playwright/test/cli.js test --config=playwright.controles-texto.config.ts` aprobada sobre el build final: solo API ficticia y red externa bloqueada; verifica posición estática del dock antes del main en seis pantallas, ancho del nombre sin overflow interior, selector de mes ancho y sin overflow horizontal a320px, fuente raíz200%, escalado de métricas y apertura del chat desde Cuentas.
Capturas inspeccionadas: Configuración, Cuentas200%, Presupuestos200% claro/oscuro e Inicio200%. Evidencias locales en frontend/test-results/controles-texto-local-cont-f44b2-ren-ni-fragmentan-contenido. No se suben capturas ni datos privados.
No demuestra teclado real Android, TalkBack, conformidad WCAG completa ni funcionamiento del backend. Android físico/aceptación visual y contraste medido pendientes. Sin instalación, APK, publicación web ni integración a develop/main.

## Git y próximos pasos
Auditoría subida en auditoria/visual-1111, b29ea7f; chat subido en mejoras/chat-visual-espacio-error,0fd3f6a; ambos commits verificados con ls-remote. Esta etapa se sube por separado con su documentación. CI remota no comprobada aquí; no confundir push con despliegue ni integración.
Siguiente: aceptación por sección de la fila superior de accesos y revisión de navegación/formularios de Cuentas y Presupuestos; medir contraste y completar listas pobladas/MSI/compartidos con fixtures. No añadir Próximos/favoritos ni unificar asistentes sin propuesta concreta. Mantener historial aplazado, calendario, reglas/Groq e idempotencia, texto solo de sesión y PR271 obsoleto.

Continuación: lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/CONTROLES_TEXTO_2026-11-11.md. Usa .local/worktrees/controles-texto, rama mejoras/controles-texto-accesible. Código comprobado localmente y por subir/verificar según el estado real del remoto; no instalar/publicar automáticamente. Siguiente sección: navegación y formularios de Cuentas/Presupuestos, con aceptación visual pendiente.
