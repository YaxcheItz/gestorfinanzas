# Compartidos y Avisos: texto ampliado — 14 noviembre 2026

## Base y alcance

Continuación solicitada por el propietario con datos ficticios. Se reconsultó el remoto: develop fe13575532c8c055fe699374660988a888b01f6f y Reportes/Metas e4ca4e345156b81c40327659889bee3ee9f10d0c. GitHub confirma CI43608740365 y Android43608740305 completed/success para ese último SHA. Rama nueva mejoras/compartidos-avisos-texto-ampliado creada desde origin/develop comprobado y actualizada por fast-forward con Reportes/Metas. Worktree .local/worktrees/compartidos-avisos-texto-ampliado.

Se aplicaron redesign-existing-projects, ui-ux-pro-max, ponytail, playwright-cli y ecc-verification-loop para diagnóstico renderizado, cambios mínimos y verificación. Angular21/Tailwind3 existentes; sin dependencias nuevas. Solo se modifica presentación en Compartidos y Avisos. Se conservan acciones, permisos, reglas, importes y persistencia.

## Hallazgos presentados y correcciones

| Sección | Evidencia previa | Corrección |
|---|---|---|
| Compartidos, desglose de gastos | Nombres de participantes recortados por truncate; al320/200% disponen214px y necesitan772/614px en oscuro. También se reproduce con un nombre a390/100%. | El span usa break-words y altura natural, manteniendo porcentaje, importe y orden. |
| Avisos, texto y formulario | A200% el título sigue17px, importe15px, enlaces13px, etiquetas14px y campos16px. | Los cinco tamaños pasan a rem equivalentes. Con raíz32px:34/30/26/28/32px respectivamente. A100% se preservan los tamaños previos. |
| Avisos, navegación de secciones | «Bancos y cuentas» tiene132px disponibles y necesita150px en oscuro320/200% (139px en claro). | Navegación con flex-wrap y base8rem por botón: se apilan cuando falta espacio, conservando el texto y estado seleccionado. |

No se rediseñan tarjetas ni paneles bancarios. Los importes y palabras largos pueden ocupar varias líneas al200%; no se reduce la fuente para esconderlos. El recorrido no verifica cálculos ni redondeos financieros.

## Verificación local

- Tres regresiones nuevas fallaron antes por los tres defectos: nombres recortados,17px frente a34px y botón desbordado. Después aprobaron3/3 en14,4s.
- Regresiones: ambos temas320/200%,390/100% y1280/100%; nombres completos, fuente calculada real, sin desborde de documento/diálogo, formularios aporte/gasto/pago y cuatro repartos. Se prueban cierre con Escape, devolución de foco, advertencia de posible duplicado, cambio de panel y activación por teclado. No se confirma ni envía ninguna operación.
- El arnés Android sintético existente se mueve a un helper compartido sin cambiar su comportamiento; se añade un fondo ficticio tipado. Las pruebas nuevas verifican cero escrituras API y cero llamadas nativas de configuración, reintento, borrado o ajustes.
- Auditoría antes/después:64 vistas por versión,128 capturas. Incluye Compartidos sin vínculo/poblado, formularios, Avisos poblados, revisión, alta, advertencia de duplicado, conexiones, asociaciones/editor y permisos. Cuatro configuraciones de ancho/fuente/tema. Cero errores JavaScript y escrituras. Antes: nombres truncados y navegación recortada; después: cero recortes detectados y cero desbordes del documento en las64 vistas.
- Perfiles nuevos, API interceptada, service worker bloqueado y red externa bloqueada. Los puentes Android son ficticios; no se usa una cuenta real ni se abre el teléfono.
- Build488,56kB aprobado (presupuesto500kB). Avisos de presupuesto CSS:Login4,30kB y automatic-bank5,02kB previos;Avisos pasa4,49→4,53kB. No hay errores de compilación.
- TypeScript estricto de los specs/helper aprobado.579 unitarias/66 archivos aprobadas. Regresión integral72 E2E en curso; resultado y CI del commit final por registrar al cerrar.

Comparativa privada: http://127.0.0.1:14349 . Selectores,128 imágenes y adaptación390px comprobados con Chromium aislado,sin errores JS. Son capturas estáticas; las regresiones verifican la interacción real. Archivos en .local/revision-compartidos-avisos; evidencia en frontend/.local/compartidos-avisos-before,compartidos-avisos-after,compartidos-avisos-regresion-before/after y compartidos-avisos-integral-final. No se suben capturas/perfiles a Git.

## Continuidad

Publicar rama y PR borrador hacia develop y verificar SHA remoto/CI antes del cierre. Sin integración, despliegue o instalación. PR271 excluido. Calendario aprobado,historial sin rediseño de estructura/datos,lentitud/logout aplazados. No se atribuyen estas pruebas a notificaciones bancarias reales ni al comportamiento físico de Android.

Siguiente paso: valoración de la comparativa de Compartidos/Avisos; después continuar por secciones con Ajustes según el plan vigente. Para otro chat: «Lee AGENTS.md,docs/ESTADO_SESION.md,docs/PLAN_MAESTRO_KAPTAL.md y docs/REVISION_COMPARTIDOS_AVISOS_2026-11-14.md. Revalida SHA/CI de mejoras/compartidos-avisos-texto-ampliado y revisa la comparativa14349. Continúa por secciones con datos ficticios; no integrar PR271».
