# Reportes y Metas: revisión de texto ampliado — 14 noviembre 2026

## Base y límites

Continuación explícita del propietario el14 de noviembre. Se verificaron PR277 en9e573b0 y PR278 en c56395f con CI general/Android aprobadas; PR278 confirma579 unitarias,130 E2E y4 PWA separadas. Rama nueva mejoras/reportes-metas-texto-ampliado creada desde develop remoto fe13575532c8c055fe699374660988a888b01f6f comprobado,incorporando c56395fbeaa935e71e296bc65b8242d16dda4bfa por fast-forward. Worktree .local/worktrees/reportes-metas-texto-ampliado. Sin PR271.

Se usan las pautas de redesign-existing-projects y playwright-cli para diagnosticar interfaz renderizada y comprobar cambios puntuales. Angular/Tailwind y dependencias existentes; no se añade ninguna biblioteca o servicio. No cambian cálculos,datos,APIs,persistencia,idempotencia o reglas financieras.

## Hallazgos y cambios

| Sección | Evidencia previa | Corrección |
|---|---|---|
| Reportes,gráfica completa | Seis meses,a320px y fuente200%:etiquetas inferiores terminan en y4127,64 y el texto de Ver cifras por mes empieza y4116,64;invaden11px. También ocurre en claro (10px). | Altura natural en lugar de180px fija,columnas que conservan espacio en rem y desplazamiento horizontal interno cuando no caben. Etiquetas de mes/año en una línea; no se cambia orden,valor,altura relativa de barras o trama de gastos. A390/1280 y100% no se introduce desplazamiento. |
| Metas,campos y botones | Al200%,párrafos/títulos crecen pero input/select/button permanecen16px. Las acciones repiten el nombre completo de la meta en cada botón. | 1rem permite32px al200%. Textos visibles Aportar/Retirar/Cancelar meta/Reanudar meta,con nombre completo preservado en aria-label para distinguir la meta. Botones limitados al ancho disponible;se conservan eventos,deshabilitados y ocultación. |
| Metas,separador del formulario | Borde superior claro heredado en el formulario de aporte/retiro oscuro. | Border-color usa el token existente,sin nueva paleta. |

Los hallazgos se comunicaron antes de corregirlos. En la gráfica ampliada el desplazamiento es visual; las seis cifras siguen disponibles en la tabla,comprobada con teclado. Algunos nombres/importes largos pueden envolver al200%;no se reduce la fuente para esconderlos.

## Verificación

Auditoría inicial/final de20 vistas: Reportes con6 meses y2 monedas,tabla de cifras,Metas con estados en progreso/alcanzada/cancelada,apertura de aporte/retiro. Cuatro configuraciones:390px oscuro,1280px oscuro,320px/200% oscuro y claro. Datos ficticios,contexto/perfil nuevos,service worker bloqueado,API interceptada y red externa bloqueada. Cero escrituras y errores JS;no se confirma ningún aporte/retiro ni se crea/cancela una meta.

Las dos regresiones nuevas fallaron primero:16px frente a32px esperado en Metas y separación de etiquetas. La primera medición de Reportes ocurrió antes de asentarse el cambio de fuente;se esperan dos frames y fuentes para medir la geometría real,sin ampliar timeouts o relajar criterios. La nueva ejecución previa reprodujo exactamente11px de invasión. Después,ambas E2E aprobaron en11,8s: fuente real,acciones visibles breves/nombre accesible completo,texto local conservado,apertura/cierre de formularios sin enviar,ancho de botones,sin desborde de documento,último mes alcanzable y tabla con6 filas accesible por teclado. TypeScript estricto del spec aprobado.

Capturas finales:20 vistas sin desbordes inesperados;las columnas fuera de la gráfica desplazable son contenido intencional recortado por ese contenedor y no desborde del documento. En oscuro320/200%,fin de etiquetas y4079,64 frente a inicio de tabla y4150,64 (71px separados). Campos y acciones de Metas32px. Build488,56kB aprobado (presupuesto500kB);avisos CSS previos Login4,30kB,Avisos4,49kB y automatic-bank5,02kB.579 unitarias/66 archivos aprobadas. Regresión integral final69 E2E en curso; cierre de SHA/CI posterior se registra en checkout principal,planes y PR para conservar la CI del código final.

Evidencias locales: baseline en .local/worktrees/etiquetas-texto-ampliado/frontend/.local/reportes-metas-before-metrics;después en frontend/.local/reportes-metas-after;pruebas focales en frontend/.local/reportes-metas-regresion-after;regresión final en frontend/.local/reportes-metas-integral-final. No se suben capturas o perfiles a Git.

## Continuidad

Sin merge,producción o instalación en el teléfono. Mantener calendario aprobado,historial sin rediseño de estructura/datos,lentitud/logout aplazados y PR271 excluido. Última indicación de teléfono fuera de la revisión;tema final pendiente de comprobación física mediante QA aislada cuando vuelva.

Siguiente sección: Compartidos y Avisos con contenido largo y sus paneles,usando datos ficticios. Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/REVISION_REPORTES_METAS_2026-11-14.md. Revalida SHA/CI de mejoras/reportes-metas-texto-ampliado y sigue con Compartidos/Avisos;no usar datos reales ni integrar PR271».


La comprobación adicional de foco con6 meses detectó que Chromium hacía tabulable automáticamente la nueva caja desplazable pese a aria-hidden. Se reprodujo con Shift+Tab desde el resumen de la tabla y se añade tabindex=-1 a la gráfica decorativa;la tabla conserva el acceso por teclado. La ejecución integral intermedia se detuvo tras50 casos aprobados al añadir esta corrección;no se presenta como cierre. Se repiten build,ambos casos focales y la regresión final sobre la plantilla corregida.
