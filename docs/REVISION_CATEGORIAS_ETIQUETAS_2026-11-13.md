# Revisión de Categorías y Etiquetas — 13 noviembre 2026

## Categorías y Etiquetas — 13 noviembre 2026

La revisión avanzó mientras terminaba la CI de Presupuestos. Se inspeccionaron16 vistas de categorías pobladas/editor/colores y etiquetas, en390/1280 oscuros y320px/200% en ambos temas. Categorías no presenta nuevos desbordes demostrados en ese alcance; los verdes elegidos como color de categoría son intencionales y se conservan. El primer intento de auditoría apuntó a input[type=color],inexistente en el selector actual; se corrigió al fieldset Color y el recorrido completó sin errores JS/escrituras. No se presenta aquel timeout del arnés como fallo de aplicación.

En Etiquetas,al320/200%,el botón Eliminar comprimía el nombre casi letra por letra y el campo de alta quedaba en100,72px. Se presentó el hallazgo antes de corregirlo. Nueva rama mejoras/etiquetas-texto-ampliado creada desde develop remoto fe13575532c8c055fe699374660988a888b01f6f comprobado,incorporando9e573b0/PR277 por fast-forward; worktree .local/worktrees/etiquetas-texto-ampliado. No se reutiliza la rama anterior.

Cambio mínimo en Etiquetas: campo con base12rem y filas que pueden envolver; el nombre conserva una base12ch y el botón no se comprime. Al aumentar la fuente,el nombre y la acción pueden ocupar filas propias. No se reduce fuente ni se trunca nombre,ni se cambian creación/eliminación,confirmación,validaciones o servicios. No se guardó ni eliminó ninguna etiqueta. La prueba reproduce primero el campo100,72px frente al mínimo200px; después verifica nombre de al menos180px y hasta5 líneas,campo de al menos200px con fuente32px,acciones44px dentro de pantalla,sin desbordes y conservando texto local sin enviar,en cuatro configuraciones.

Build final488,56kB aprobado (presupuesto500kB); advertencias CSS previas Login4,30kB,Avisos4,49kB y automatic-bank5,02kB. E2E focal y TypeScript estricto aprobados. Regresión integral final67 casos en curso;no atribuir a este SHA las66 de PR277. API ficticia,red externa bloqueada,cero escrituras y erroresJS en la prueba. Publicar rama y PR borrador,verificar SHA/CI exactos y registrar resultados posteriores en checkout principal/planes/PR sin sustituir CI mediante pushes documentales. PR277 conserva su propio9e573b0,66 E2E locales y CI remota en curso al escribir esto.

Informe: docs/REVISION_CATEGORIAS_ETIQUETAS_2026-11-13.md. Comparativa específica de etiquetas se añadirá a14337. Teléfono desconectado,sin instalación o producción. Mantener calendario aprobado,historial sin rediseño de estructura/datos,lentitud/logout aplazados y PR271 excluido.

Siguiente sección: Reportes y Metas con sus controles/estados poblados,usando datos ficticios. Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/REVISION_CATEGORIAS_ETIQUETAS_2026-11-13.md,además de REVISION_CUENTAS_PRESUPUESTOS_2026-11-13.md. Revalida los SHA/CI de PR277 y de mejoras/etiquetas-texto-ampliado; sigue con Reportes/Metas. Teléfono desconectado; no usar datos reales».


Publicado313af8d8e797ac73cd4407c3e84d09826d18e918 en PR278 borrador hacia develop,remoto verificado. CI general43553451812 y Android43553451833 en curso;duplicada push43553415165 cancelada intencionadamente tras verificar SHA/evento y ejecuciones PR. Comparativa14337 incluye Etiquetas y distingue correctamente PR277/PR278,28 estados/56 imágenes sin roturas,ajuste390px comprobado. La nueva prueba focal conserva nombres completos y fuente32px;67 E2E integrales finales en curso.


Validación local definitiva de313af8d:67/67 E2E aprobadas en4,4min (frontend/.local/etiquetas-integral-final),incluyendo las dos regresiones nuevas y auditoría28 combinaciones de texto/foco. CI frontend132320879404 confirma579 unitarias/66 archivos,build y revisión de dependencias aprobados. No se atribuye la CI de9e573b0 a este SHA. Comparativa14337 verificada en28 estados/56 imágenes. PR277 pasó su fase API/E2E y está en PWA al registrar;CI final de ambas partes por confirmar.

Dependencia PR277 cerrada:CI43552587091 y Android43552587113 aprobadas en9e573b0. Android43553451833 de313af8d también aprobado;CI general43553451812 aún en curso.


## Incidencia de CI313af8d: limpieza del arnés MSI

CI general43553451812 falló en el caso preexistente msi-anterior-acciones.spec.ts: apiResponse.json: Response has been disposed.129 E2E aprobaron,4PWA se omitieron condicionalmente y1 falló;Android43553451833 y los otros cinco trabajos generales aprobaron. La regresión nueva de Etiquetas también aprobó remotamente. PWA separada no llegó a ejecutarse y no se declara aprobada para este SHA.

Se descargó artefacto14098145395 (.local/ci-313af8d-evidence) y se leyó la traza. La aserción final de saldo/retención[0,0] terminó en348394,863;teardown de contexto empezó348395,397 mientras un GET interceptado seguía abierto hasta348397,985. El cierre invalidó la respuesta que el callback estaba leyendo. Se añade finally con page.unrouteAll({behavior:'wait'}) al caso MSI,usando la API disponible en los tipos de Playwright;se esperan callbacks,sin ignorar errores,ampliar timeouts o quitar aserciones. No se cambia lógica MSI ni se toca ninguna compra real. TypeScript estricto aprobado. Se está repitiendo3 veces contra backend H2 en memoria/perfil test y frontend local14341;configuración aislada de pruebas,ningún servicio de producción. Nuevo SHA/CI pendientes al registrar.


## Corrección de cierre del arnés tras CI313af8d

CI43553451812 falló en msi-anterior-acciones.spec.ts con apiResponse.json: Response has been disposed;129 E2E aprobadas,4 PWA omitidas condicionalmente y1 fallo. La nueva prueba de Etiquetas aprobó remotamente; Android43553451833 y los otros cinco trabajos generales aprobaron. La fase PWA separada no se ejecutó tras ese fallo.

Artefacto14098145395 y trace.zip conservados en frontend/.local/ci-313af8d-evidence. La traza registra que la aserción final[0,0] completó348394,863 y el teardown de contexto empezó348395,397,con un GET interceptado aún abierto hasta348397,985. El callback leía una respuesta invalidada al cerrar. Se añade finally con page.unrouteAll({behavior:'wait'}) antes de que termine el test. La API está documentada en los tipos de Playwright instalado: espera handlers en curso. No se ignoran errores,no se aumentan timeouts,reintentos o umbrales y no se quitan aserciones. No se cambia la lógica MSI ni ninguna compra real.

Verificación local:3/3 repeticiones del caso aprobadas en1min,con backend de perfil test/H2 en memoria y frontend local14341;puertos18080/14341 libres al terminar. TypeScript estricto del caso aprobado. Las67 E2E visuales de313af8d aprobaron en4,4min;la fuente de aplicación y estilos se mantienen idénticos tras esta corrección exclusiva del arnés. No se presenta H2 como PostgreSQL ni como validación real de usuario. La CI completa del nuevo SHA sigue pendiente hasta su comprobación y se registra en checkout principal/planes/PR.


Nuevo cierre candidato publicado:c56395fbeaa935e71e296bc65b8242d16dda4bfa,remoto comprobado;PR278 borrador. Solo añade finally/unrouteAll(wait) al arnés MSI y documentación sobre313af8d,con fuente de aplicación/estilos idénticos.3/3 repeticiones H2 y TypeScript aprobados,servidores temporales detenidos. CI general43555058023 y Android43555058028 en curso sobre el nuevo SHA;push duplicado43555054177 cancelado tras comprobar SHA/evento y ejecuciones PR. La interfaz capturada en313af8d sigue siendo la misma del nuevo head,con67 E2E visuales aprobadas;la CI completa nueva queda pendiente.
