# Revisión de Categorías y Etiquetas — 13 noviembre 2026

## Categorías y Etiquetas — 13 noviembre 2026

La revisión avanzó mientras terminaba la CI de Presupuestos. Se inspeccionaron16 vistas de categorías pobladas/editor/colores y etiquetas, en390/1280 oscuros y320px/200% en ambos temas. Categorías no presenta nuevos desbordes demostrados en ese alcance; los verdes elegidos como color de categoría son intencionales y se conservan. El primer intento de auditoría apuntó a input[type=color],inexistente en el selector actual; se corrigió al fieldset Color y el recorrido completó sin errores JS/escrituras. No se presenta aquel timeout del arnés como fallo de aplicación.

En Etiquetas,al320/200%,el botón Eliminar comprimía el nombre casi letra por letra y el campo de alta quedaba en100,72px. Se presentó el hallazgo antes de corregirlo. Nueva rama mejoras/etiquetas-texto-ampliado creada desde develop remoto fe13575532c8c055fe699374660988a888b01f6f comprobado,incorporando9e573b0/PR277 por fast-forward; worktree .local/worktrees/etiquetas-texto-ampliado. No se reutiliza la rama anterior.

Cambio mínimo en Etiquetas: campo con base12rem y filas que pueden envolver; el nombre conserva una base12ch y el botón no se comprime. Al aumentar la fuente,el nombre y la acción pueden ocupar filas propias. No se reduce fuente ni se trunca nombre,ni se cambian creación/eliminación,confirmación,validaciones o servicios. No se guardó ni eliminó ninguna etiqueta. La prueba reproduce primero el campo100,72px frente al mínimo200px; después verifica nombre de al menos180px y hasta5 líneas,campo de al menos200px con fuente32px,acciones44px dentro de pantalla,sin desbordes y conservando texto local sin enviar,en cuatro configuraciones.

Build final488,56kB aprobado (presupuesto500kB); advertencias CSS previas Login4,30kB,Avisos4,49kB y automatic-bank5,02kB. E2E focal y TypeScript estricto aprobados. Regresión integral final67 casos en curso;no atribuir a este SHA las66 de PR277. API ficticia,red externa bloqueada,cero escrituras y erroresJS en la prueba. Publicar rama y PR borrador,verificar SHA/CI exactos y registrar resultados posteriores en checkout principal/planes/PR sin sustituir CI mediante pushes documentales. PR277 conserva su propio9e573b0,66 E2E locales y CI remota en curso al escribir esto.

Informe: docs/REVISION_CATEGORIAS_ETIQUETAS_2026-11-13.md. Comparativa específica de etiquetas se añadirá a14337. Teléfono desconectado,sin instalación o producción. Mantener calendario aprobado,historial sin rediseño de estructura/datos,lentitud/logout aplazados y PR271 excluido.

Siguiente sección: Reportes y Metas con sus controles/estados poblados,usando datos ficticios. Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/REVISION_CATEGORIAS_ETIQUETAS_2026-11-13.md,además de REVISION_CUENTAS_PRESUPUESTOS_2026-11-13.md. Revalida los SHA/CI de PR277 y de mejoras/etiquetas-texto-ampliado; sigue con Reportes/Metas. Teléfono desconectado; no usar datos reales».


## Corrección de cierre del arnés tras CI313af8d

CI43553451812 falló en msi-anterior-acciones.spec.ts con apiResponse.json: Response has been disposed;129 E2E aprobadas,4 PWA omitidas condicionalmente y1 fallo. La nueva prueba de Etiquetas aprobó remotamente; Android43553451833 y los otros cinco trabajos generales aprobaron. La fase PWA separada no se ejecutó tras ese fallo.

Artefacto14098145395 y trace.zip conservados en frontend/.local/ci-313af8d-evidence. La traza registra que la aserción final[0,0] completó348394,863 y el teardown de contexto empezó348395,397,con un GET interceptado aún abierto hasta348397,985. El callback leía una respuesta invalidada al cerrar. Se añade finally con page.unrouteAll({behavior:'wait'}) antes de que termine el test. La API está documentada en los tipos de Playwright instalado: espera handlers en curso. No se ignoran errores,no se aumentan timeouts,reintentos o umbrales y no se quitan aserciones. No se cambia la lógica MSI ni ninguna compra real.

Verificación local:3/3 repeticiones del caso aprobadas en1min,con backend de perfil test/H2 en memoria y frontend local14341;puertos18080/14341 libres al terminar. TypeScript estricto del caso aprobado. Las67 E2E visuales de313af8d aprobaron en4,4min;la fuente de aplicación y estilos se mantienen idénticos tras esta corrección exclusiva del arnés. No se presenta H2 como PostgreSQL ni como validación real de usuario. La CI completa del nuevo SHA sigue pendiente hasta su comprobación y se registra en checkout principal/planes/PR.
