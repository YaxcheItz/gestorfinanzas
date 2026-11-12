# Ampliación de auditoría visual y funcional — 11 noviembre 2026

Continúa REVISION_VISUAL_2026-11-11.md. Solo diagnóstico y propuestas: ningún archivo de aplicación modificado. Evidencias nuevas en `.local/visual-deep-1111` del checkout principal. Scripts reproducibles `.local/visual-deep.cjs`, `visual-chat-deep.cjs`, `visual-states.cjs`. Backend sustituido por respuestas ficticias, red externa bloqueada. No se confirmó ni guardó ninguna propuesta. No se probaron reglas/backend mediante estas respuestas.

## Corrección del informe anterior
“Registrar por voz o texto” es el aria-label del micrófono; no es un rótulo visible ordinario. El usuario no lo ve y el flujo de voz inicial es coherente con un micrófono. Retirar la clasificación de fallo visual: queda como posible mejora de accesibilidad/nombre, de prioridad baja. No añadir un botón de texto a voz sin decidir antes si es útil. El lápiz ya abre el chat escrito.

## Evidencia adicional y hallazgos
| Prioridad | Sección / observación | Evidencia y propuesta |
|---|---|---|
| Alta | Chat: el espacio útil de conversación es reducido; la propuesta tiene acciones parcialmente fuera de la zona visible. | propuesta.png a390 y propuesta-altura-reducida.png a390x480. Al reducir altura, el título y entrada manual mantienen mucho espacio mientras se recortan acciones. Propuesta: panel expandible y cabecera más compacta cuando hay conversación; asegurar acceso visible a las acciones mediante scroll/foco. Altura reducida NO simula completamente el teclado Android. |
| Media | Chat: “Descartar” rompe una palabra en dos líneas incluso a390px. | propuesta.png y chat-error.png. Dar ancho mínimo a esa acción o apilar botones; mantener semántica de descartar frente a guardar. |
| Alta | Chat/error: el mensaje 503 ficticio existe en el DOM pero queda fuera del área visible tras el intento; solo se ve una franja del aviso. | chat-error.png. Texto enviado se conserva, lo cual es correcto. Propuesta: error junto al compositor, siempre visible, con reintento inequívoco. Confirmar conducta cuando el usuario ha desplazado voluntariamente el historial antes de cambiar auto-scroll. |
| Media | Editor del chat: en390x844 solo se ven Tipo, Monto, Fecha e inicio de Cuenta; los demás campos y actualización exigen scroll interno. | editar-propuesta.png. El editor sí existe y no guarda automáticamente. Propuesta: darle más altura o una vista dedicada temporal y reducir cabecera redundante; mantener separación Actualizar propuesta/Confirmar registro. No llamarlo bloqueo funcional. |
| Alta | Cuentas, fuente raíz200%,320px: nombre largo se fragmenta en grupos de letras y consume casi toda una pantalla larga. | cuentas-200.png. Propuesta: icono fuera de la columna del nombre, menor padding adaptativo y ancho completo para texto. Prueba CSS de ampliación; falta ajuste real Android. |
| Media | Presupuestos, fuente200%,320px: mes recortado y CTA vacío fragmentado. | presupuestos-200.png. Apilar mes/año y dar ancho completo a la etiqueta del CTA; evitar dos CTA principales equivalentes en estado vacío. |
| Media | Inicio no escala como las otras secciones al cambiar fuente raíz200%. | dashboard-200.png frente a cuentas-200.png. Hipótesis: tamaños fijos en estilos; confirmar con zoom/texto Android. No afirmar conformidad ni incumplimiento WCAG completo a partir de esta prueba. |
| Alta | Controles flotantes solapan contenido también en Reportes, Metas y Libro diario. | reportes.png, metas.png, libro-diario.png. Ocultan importes, explicación y filtros en la posición inicial. Se puede desplazar: no se afirma inaccesibilidad permanente. Priorizar una zona de acciones consistente que no cubra la lectura. |
| Media / decisión pendiente | Cuentas presenta tipo DEBITO como Inversión. | cuentas.png; cuentas.component.ts:812–813, y prueba explícita en cuentas.component.spec.ts:308. Es comportamiento codificado, no error de la fixture. Confirmar motivación/compatibilidad histórica antes de cambiar etiquetas; nunca migrar cuentas reales por este hallazgo. |
| Baja / oportunidad | Inicio con una sola categoría dedica mucha altura a una única barra y trunca el nombre. | dashboard.png: nombre largo completo disponible en fixture. Considerar resumen compacto cuando solo hay una categoría, con acceso al nombre completo. Preservar calendario y composición aprobada hasta decisión del usuario. |
| Media / consistencia | Metas muestra formulario completo al entrar; Categorías abre creación aparte; Etiquetas usa captura inline; los títulos/acciones no siguen una misma escala. | metas.png, categorias.png, etiquetas.png. Unificar patrón según complejidad: creación inline para una etiqueta, vista/formulario desplegable para una meta; no obligar a todas a ser idénticas. |
| Media / lenguaje | Libro diario explica “sistema existente”, partida doble y conciliación antes de permitir consultar. | libro-diario.png. Mover explicación técnica a “Cómo funciona”; conservar filtros, auditoría y conciliación como herramientas avanzadas. No eliminar contabilidad. |

## Cobertura real
Vistas inspeccionadas directamente: Inicio con resumen ficticio, Cuentas con nombre largo/cifra grande, Reportes, Presupuestos vacío, Metas vacío, Categorías vacío, Etiquetas vacío, Avisos web vacío, Libro diario, Configuración, Historial vacío, Asistente, chat inicial/propuesta/editor/error y voz inicial. Los estados vacíos no prueban listas pobladas. La fixture de pareja original era una lista en vez de objeto/null: captura descartada como evidencia funcional. Las rutas de autenticación se capturaron con usuario sintético ya presente: no certifican onboarding anónimo. Datos del resumen y movimientos son independientes para estrés visual; no representan contabilidad coherente.
Sin desbordamiento horizontal del documento en las cinco pantallas medidas a320 con fuente raíz200%, pero eso NO descarta cortes interiores (se encontraron).
Pendientes: recorridos con movimientos/MSI detallados, edición de cuentas y catálogo, asociaciones Android, pareja con contrato completo, onboarding anónimo, contraste calculado, TalkBack/foco completo, teclado/barras reales, sin conexión y recuperación, persistencia de cambios de tema, historial largo, consultas IA reales. No se probó motor financiero, voz/transcripción real ni proveedor externo. No declarar terminada una auditoría integral.

## Referencias públicas consultadas
- MonAi: https://www.get-monai.app/index.html y ficha https://apps.apple.com/us/app/expense-tracker-monai/id6447112647. Referencia de captura natural y consulta sencilla; no se instaló ni se probó su app.
- Wallet: https://budgetbakers.com/en/products/wallet/features/planned-payments/ y https://help.budgetbakers.com/wallet/a/setup-planned-payments-7149523920786. Referencia para próximos pagos visibles y estado pendiente.
- Spendee: https://help.spendee.com/article/224-shared-wallets y https://help.spendee.com/article/215-is-it-possible-to-share-budgets. Referencia para distinguir cartera compartida y presupuesto individual. No asumir que todos sus modelos sirven a Kaptal.
Comparación documental, no benchmark visual presencial ni recomendación de comprar suscripciones.

## Qué mantener, simplificar, quitar o añadir (propuestas, NO implementadas)
MANTENER: calendario aprobado, captura por reglas y Groq opcional, confirmación de propuestas, registro automático ya autorizado, cuentas/MSI, privacidad, pruebas/idempotencia y distinción de movimiento local/servidor.
SIMPLIFICAR: panel/editor del chat; accesos de Configuración; consistencia de formularios; diferencia entre lista, cuenta y fondo de pareja; jerarquía de reportes.
QUITAR DE LA VISTA PRINCIPAL, NO DE LA APP: explicación técnica del libro diario; llamadas repetidas a crear en estados vacíos; espacio redundante de cabecera del chat. Evaluar unificar acceso del Asistente completo con el chat, pero no eliminar hasta comprobar reportes/evidencia/exportación/consentimiento equivalentes. No hay evidencia suficiente para declarar una función “inútil”.
AÑADIR O EXPONER MEJOR:
1. Acceso “Próximos” con cuotas MSI y recurrencias ya existentes, fecha/estado/importe y moneda; derivado de fuentes actuales sin crear cargos ni duplicar operaciones.
2. Estado compacto de recepción automática: registrado, por revisar, error y último resultado técnico sin exponer aviso sensible; enlazar a bandeja existente.
3. Accesos favoritos opcionales a Cuentas, Presupuestos y Reportes; evitar llenar Inicio de widgets obligatorios.
4. Resumen de presupuesto restante contextual y acceso a movimientos que lo explican; reutilizar presupuestos existentes.
5. Ayuda contextual breve para listas compartidas/cuentas/metas; no tutorial forzado ni asistente adicional.
NO AÑADIR AHORA: otro chat, borradores persistentes, adornos animados, gamificación, conectores bancarios nuevos, OCR/IA adicional o guardado por voz distinto al autorizado. Requieren necesidad concreta y evaluación aparte.

## Orden de decisiones
1. Chat: espacio, propuesta, error y editor (máximo impacto demostrado).
2. Capa de acciones flotantes en todas las secciones y tamaños de texto.
3. Cuentas y presupuestos: legibilidad, etiquetas y formularios.
4. Configuración y navegación: favoritos, herramientas avanzadas y duplicaciones.
5. Inicio/Reportes: resumen compacto y próximos movimientos, sin cambiar calendario.
6. Avisos y compartidos: estado, alcance y ayudas.
7. Catálogos/Metas y onboarding. Historial: fallos concretos; rediseño sigue aplazado.

## Texto para continuar
Continúa la revisión de Kaptal en rama auditoria/visual-1111, worktree .local/worktrees/revision-visual-1111. Lee AGENTS.md, ESTADO_SESION.md, PLAN_MAESTRO_KAPTAL.md y REVISION_DISENO_AMPLIADA_2026-11-11.md. Evidencias del checkout principal: .local/visual-deep-1111. Primero valida los hallazgos del chat y completa pendientes; presenta decisiones por sección antes de implementar. No instalar/publicar ni usar datos reales; conserva calendario, historial aplazado y ausencia de borradores persistentes. El aria-label voz/texto no es un fallo visual visible.
