# Revisión visual Kaptal — 11 noviembre 2026

## Alcance y evidencia
Auditoría inicial, NO revisión completa certificada. Sin rediseño ni cambios funcionales. Rama auditoria/visual-1111 desde origin/develop 74a85bb; origin/main 3a7e34c tiene el mismo árbol. Checkout principal 388d9d4 con modificaciones previas preservadas (AGENTS, documentos, eliminación previa de INSTALACION_COMPLETA_OPENCODE.md y error.log).
ADB confirma com.kaptal.app 0.1.44/código45; no se repitió hash/certificado ni se abrió la sesión real. Build local aprobado con avisos de presupuesto CSS. No implica funcionamiento integral.
Capturas en .local/visual-1111; results.json contiene rutas, texto y mediciones. Chromium aislado, API interceptada con usuario 995 ficticio, tráfico externo bloqueado y servidor sin proxy. Sin cuentas ni movimientos reales. Datos vacíos de prueba: algunas respuestas no representan correctamente los contratos de Inicio/Reportes; excluir sus skeletons como diagnóstico de producción.
Se capturaron 16 rutas a 390x844. Inspección visual directa: Configuración, Historial vacío, Asistente, captura manual inicial, voz inicial y chat escrito inicial. Chat/voz explorados a 320x640, 390x844 oscuro y 1280x800. Los nombres chat-*.png corresponden finalmente al chat escrito. La captura por sí sola de otras rutas NO equivale a revisión visual exhaustiva.

## Hallazgos por sección
| Prioridad / tipo | Dónde y evidencia | Impacto y propuesta |
|---|---|---|
| Alta / superposición observada | Configuración, configuracion.png: botones flotantes cubren parte de Categorías a la altura del borde inferior del viewport. Asistente, asistente.png: cubren las sugerencias. | Ocultan texto/acciones mientras se desplaza. Evaluar una zona inferior reservada o esconder/reubicar controles en estas pantallas; comprobar con scroll y foco antes de cambiar. No se afirma que el contenido sea permanentemente inaccesible. |
| Media / usabilidad | Entrada de voz: el control anuncia “Registrar por voz o texto”, pero abre una ventana inicial con solo micrófono. Código quick-capture.component.ts: opción Escribir en el chat condicionada a transcripción lista. | Quien quiere escribir puede interpretar que necesita grabar. Aclarar nombre/acceso o mostrar alternativa de escritura desde el inicio, preservando el flujo aceptado. |
| Media / texto condicional comprobado | Asistente: sin estado válido del proveedor, pantalla dice Google Gemini; asistente.component.ts:296–299 usa Gemini como fallback, incluso sin provider. | El consentimiento podría identificar un proveedor sin confirmación. Mostrar estado pendiente/no disponible hasta conocer proveedor. No demuestra que producción use Gemini ni que Groq falle. |
| Media / jerarquía | Configuración: “Más herramientas” reúne Cuentas, Metas, Avisos, Presupuestos, Reportes, Libro diario y Gastos compartidos tras varias secciones. | Acceso poco directo a funciones frecuentes. Decidir con el usuario cuáles merecen acceso destacado; oportunidad de usabilidad, no error funcional. |
| Baja / claridad | Chat escrito inicial, chat-320-false.png: Añadir movimiento, Introducir datos manualmente y Cuéntame tu movimiento compiten en una ventana compacta. | Probar una jerarquía más simple conservando ambas entradas. Preferencia de diseño, no defecto. |

## Lo que se conserva
Identidad actual, calendario aprobado y aplazamiento del rediseño del historial. Historial vacío legible y con llamada a añadir movimiento; no se encontró desbordamiento horizontal en el muestreo de rutas a 390px. Chat inicial de 320px muestra entrada, micrófono, envío y cierre dentro de la ventana. Esto no valida conversación larga ni teclado físico. No reintroducir borradores persistentes ni integrar PR271. La confirmación del usuario sobre Amex no prueba compatibilidad universal.

## Inventario y pendientes
Rutas inventariadas: Inicio, cuentas, movimientos, reportes, presupuestos, metas, categorías, etiquetas, pareja, configuración, avisos, libro diario, asistente, login, registro, recuperación y vincular-canal (esta última sin captura).
Componentes por revisar completamente: selector/listas, calendario, filtros/detalle/editor de movimientos y MSI, formularios de cuentas/categorías/etiquetas/metas/presupuestos, asociaciones de bancos, respaldo, seguridad, permisos y confirmaciones.
Pendiente prioritario: ampliar fixtures con contratos reales para Inicio/Reportes, cuentas ficticias con nombres largos y cifras grandes; conversación/propuestas/edición/categorización, error de voz y transcripción, consulta y consentimiento IA; estados error/sin conexión/carga/deshabilitado; contraste medido, fuentes al 200%, teclado y foco, TalkBack, barras y áreas seguras en Android físico aislado. No ejecutar compras reales ni usar la sesión del propietario. El recorrido realizado no prueba contabilidad, API, registro automático, idempotencia ni MSI.

## Orden recomendado por secciones
1. Completar evidencia sintética del chat (propuestas y teclado), después decidir sus ajustes.
2. Controles flotantes en Configuración y Asistente.
3. Nombres de entrada y proveedor IA confirmado.
4. Navegación de Configuración y formularios de cuentas/catálogos.
5. Inicio/Reportes con fixtures correctas, estados y accesibilidad transversal.
6. Historial: solo fallos concretos; rediseño aplazado. Calendario: conservar.

## Continuación lista para pegar
Continúa la auditoría visual de Kaptal en .local/worktrees/revision-visual-1111, rama auditoria/visual-1111. Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md, docs/REVISION_VISUAL_2026-11-11.md y los planes/prompts .local del checkout principal. Revisa evidencias .local/visual-1111 del principal. La auditoría es parcial: completa fixtures y vistas de chat/propuestas, estados y accesibilidad antes de proponer implementación por sección. No rediseñar ni instalar/publicar. Preserva cambios previos, sesión real, calendario y ausencia de borradores persistentes; PR271 obsoleto.
