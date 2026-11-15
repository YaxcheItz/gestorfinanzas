# Ajustes concretos de comparativa14359 — 15 noviembre 2026

## Base y límites

Se reconsultaron PR282 y su SHA remoto d52f3fc91b9a837cbc5c917a2e54bda597abc5bd: borrador abierto, sin integrar; CI general 43637651542 y Android 43637651540 siguen completed/success. Develop continúa en fe13575532c8c055fe699374660988a888b01f6f y main en 1fd9402bb40012aba4c894b81ecceb09dcfb48a1.

Rama nueva mejoras/ajustes-visuales-comparativa14359 creada desde origin/develop actualizado y comprobado, incorporando d52f3fc por fast-forward únicamente en esta rama de trabajo. Worktree .local/worktrees/cuentas-enlace-legible. No se actualizan develop/main, integran PR ni instala; no se ejecuta despliegue manual. La Preview automática posterior se documenta en el cierre. PR271 sigue borrador abierto y no integrado, comprobado de nuevo. Calendario aprobado e historial conservados; lentitud/logout siguen aplazados.

Skills aplicadas: ui-ux-pro-max para reflujo, ponytail para limitar cambios, playwright-cli para inspeccionar la galería y pruebas renderizadas; angular-developer y ecc-verification-loop para build y comprobación final. No nuevas dependencias ni cambios de API, autenticación, persistencia o reglas financieras.

## Revisión por sección

| Sección | Hallazgo observado | Resultado de esta parte |
|---|---|---|
| Cuentas | En oscuro a 320px/200%, el flex entre texto y flecha estrechaba «transacciones» y aislaba su última letra. | Texto en flujo normal y retirada de la flecha decorativa. Conserva tamaños, enlace de toda la tarjeta, cuenta de destino y acciones de administración. |
| Captura manual | «Gasto», «Ingreso» y «Transferencia» se partían dentro de las palabras al 200%; el título compartía una fila insuficiente con privacidad/cierre. | Columnas según espacio disponible y cabecera que puede ocupar varias filas. No se reduce la tipografía. Los botones siguen seleccionando el tipo y el cierre funciona con teclado. |
| Cuentas y Presupuestos | Algunos importes se dividen dentro de la cifra a 320px/200%, aunque no desbordan el documento. | Hallazgo pendiente de la siguiente valoración visual. Esta parte no cambia formatos, precisión, importes ni escala para esconderlo. |
| Categorías, Presupuestos y Ajustes | Algunos títulos largos se dividen dentro de una palabra al 200%, como ya documentó PR282. | Se conserva el escalado de 30 a 60px. Revisar su composición junto con los importes antes de aprobar el diseño final. |
| Reportes, Metas, Etiquetas, Compartidos, Avisos y perfil | Revisadas sus capturas en las seis configuraciones y conservadas las correcciones de PR282. | Sin cambios nuevos en estas secciones. No se da aprobación estética global. |
| Chat e Inicio | Conservan la composición anterior; el campo del chat resulta estrecho con texto al 200%. | Observación para revisión posterior del chat; esta parte solo ajusta el formulario manual. Calendario conservado. |
| Movimientos | Referencia existente y navegación desde Cuentas. | Sin rediseño; conserva su tipografía y elipsis intencionadas. |

## Evidencia y comprobaciones

Cierre local del código final: build de producción 488,72kB aprobado, con los tres avisos CSS de Login/Avisos/automatic-bank ya presentes; 579 unitarias en 66 archivos aprobadas; TypeScript estricto de los nuevos tests/configuración y git diff --check correctos. Los 19 E2E de playwright.ajustes-comparativa.config.ts aprueban en 2,6min. La auditoría de 120 estados finales pasa en 1,3min y confirma cero desbordes del documento y cero fallos de contraste del texto visible medido. No son una CI nueva ni pruebas con backend real o service worker real.

La galería original http://127.0.0.1:14359 conserva las 240 imágenes de PR281 frente a PR282. Se volvió a comprobar la carga de todas ellas, sus veinte vistas/seis modos, selectores independientes y ancho de documento de 390px, sin errores JS.

Comparativa de esta parte: http://127.0.0.1:14361 . Antes = d52f3fc/PR282; después = los ajustes anteriores. Artefactos privados en .local/revision-ajustes-comparativa14359. Conserva veinte vistas, seis configuraciones y 240 imágenes. Las capturas nuevas fijan el reloj al 14 de noviembre para mantener las etiquetas de fecha comparables con la galería anterior. No se publican imágenes, perfiles o datos de prueba.

Regresiones nuevas: la prueba de palabra completa falla sobre el build inmutable d52f3fc en Cuentas oscuro a 320px/200%; en claro ya pasaba. Las dos pruebas de captura manual fallan antes del ajuste CSS, en ambos temas. Se miden los rectángulos de la palabra, porque scrollWidth por sí solo no detecta una letra aislada en otra línea.

El cierre verifica cuatro casos nuevos: dos temas por cada superficie, con 320/390/1280px y fuente al 100/200% (doce configuraciones por superficie). Incluyen escala tipográfica, geometría, selección de los tres tipos, cierre y navegación con teclado al historial filtrado por cuenta. Se suman las diez regresiones de coherencia de PR282 y los casos existentes de controles, formularios y teclado en diez secciones/cuatro diálogos.

La auditoría de veinte vistas usa API simulada, contextos nuevos, service worker y red externa bloqueados, sin escrituras, previsualizaciones ni errores JS. Las pruebas focales usan la misma protección de red/GET ficticios y comprueban cero escrituras y errores JS. No se prueba teléfono, WebView o finanzas reales.

Evidencia local en el frontend del worktree: .local-baseline.log, .local/captura-baseline.log, .local/build-final.log, .local/unitarias.log, .local/e2e-final.log, .local/ajustes-final y .local/comparativa-after-fija. Configuración reproducible de las regresiones: playwright.ajustes-comparativa.config.ts, después de npm run build. La auditoría de capturas conserva su arnés privado de la etapa anterior.

## Continuidad

Registrar los resultados de cierre y publicar esta rama hacia develop como PR borrador, verificando el SHA remoto. La CI de PR282 acredita solo d52f3fc; no acredita estos ajustes nuevos. Consultar la CI del nuevo SHA antes de cualquier integración futura.

Siguiente valoración: abrir comparativa14361, revisar Cuentas y captura manual, y después resolver la composición de cifras y títulos largos al 200%, por sección. Mantener calendario e historial, chat sin borradores, PR271 excluido y ningún despliegue.

Para otro chat: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/REVISION_AJUSTES_COMPARATIVA_2026-11-15.md. Continúa la revisión de comparativa14361 desde mejoras/ajustes-visuales-comparativa14359, dependiente de PR282/d52f3fc. Revalida SHA/CI y revisa cifras y títulos al 200% con datos ficticios. Conserva calendario/historial; no integres PR271 ni despliegues».


## Publicación comprobada / PR283 — 15 noviembre 2026

Publicado mejoras/ajustes-visuales-comparativa14359, commit d875d853b4f3a60fe18bd529dc36cb854e9ece66, idéntico al SHA remoto comprobado. PR283 borrador hacia develop: https://github.com/YaxcheItz/gestorfinanzas/pull/283 . Worktree limpio. CI general43738402517 y Android43738402492 en curso al cierre: frontend, canales y Worker aprobados, backend/PostgreSQL/E2E pendientes de concluir. No se atribuye al nuevo SHA la CI de PR282.

Local final:579 unitarias/66 archivos,19 E2E en2,6min,TypeScript estricto y build488,72kB aprobados; auditoría120 estados y galería240 imágenes, sin desbordes del documento, fallos de contraste medidos o errores JS. Capturas ficticias/contextos aislados/red externa bloqueada; sin escrituras ni previsualizaciones de datos. Comparativa14361 y original14359 disponibles, con README de reinicio.

Sin integración ni instalación; developfe13575 y main1fd9402 permanecen sin cambios y PR271 no integrado. No se ejecutó despliegue manual. La integración existente de Vercel generó automáticamente la Preview7806724356 para el SHA del PR, marcada environment=Preview y production_environment=false por GitHub; no es producción. Se registra esta automatización y no se cambia la configuración de hosting. El cierre posterior se conserva en este checkout, planes locales y PR para mantener la CI del código publicado.

Siguiente: reconsultar CI/Android del SHA d875d85 y valorar comparativa14361; después trabajar cifras y títulos largos al200% por sección, manteniendo calendario/historial, PR271 excluido y sin despliegues manuales.


Actualización posterior del cierre: Android43738402492 completed/success para d875d853b4f3a60fe18bd529dc36cb854e9ece66. CI general43738402517 sigue en curso; no se declara aprobada. Sin instalación.
