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


Publicación final:e4ca4e345156b81c40327659889bee3ee9f10d0c,remoto comprobado,PR279 borrador hacia develop. CI general43608740365 y Android43608740305 en curso;push duplicado43608685066 cancelado intencionadamente tras verificar SHA/evento y ejecuciones PR. El commit intermedio2723795 fue sustituido antes de abrir el PR. Build final488,56kB y2 E2E focales finales11,2s aprobados,TypeScript estricto aprobado;579 unitarias aprobadas antes del último atributo de foco. Regresión integral final69 casos en curso sobre e4ca4e3.

Auditoría complementaria de moneda:24 vistas primarias por versión,incluidas4 vistas USD con sus datos ficticios y4 recortes adicionales de gráfica. El primer intento del selector exacto de Moneda no contemplaba el nombre implícito de sus opciones;corregido al select observado,repetidos ambos recorridos con cero escrituras/errores JS. Comparativa privada14345 de28 estados/56 imágenes,carga de todas y ajuste390px comprobados en Edge aislado. Es una captura estática,las pruebas focales verifican desplazamiento real y teclado.


Regresión integral final de e4ca4e3:69/69 E2E aprobadas en6,6min (.local/reportes-metas-integral-final-e4ca4e3),incluyendo ambos casos nuevos y auditoría28 combinaciones de texto/foco. No se atribuye este resultado al commit intermedio2723795. Build final488,56kB,dos focales11,2s y TypeScript estricto aprobados;579 unitarias de la implementación previa al último atributo de foco,con CI del nuevo SHA por confirmar en sus logs. El recorrido complementario de24 vistas y4 recortes por versión aprobó,cero escrituras/errores JS.


CI frontend132488876869 de e4ca4e3 confirma579 unitarias/66 archivos y build aprobados;consulta de dependencias sin vulnerabilidades conocidas en esa ejecución. Android43608740305 completado/success. Los otros cinco trabajos de CI general43608740365 aprobaron;E2E/API aún en curso. Fuente final local69/69 ya aprobada.


## Cierre verificado de Reportes y Metas / PR279 — 14 noviembre 2026

Commit e4ca4e345156b81c40327659889bee3ee9f10d0c publicado y remoto comprobado,worktree limpio. PR279 borrador hacia develop,https://github.com/YaxcheItz/gestorfinanzas/pull/279 . CI general43608740365 y Android43608740305 completed/success. Los seis trabajos generales aprobaron:frontend,backend,PostgreSQL/migraciones/recuperación,WhatsApp/D1,Python y E2E Chromium/API/PostgreSQL. Log del job132488876980:132 E2E aprobadas en13,3min,4 PWA omitidas condicionalmente y después4/4 PWA aprobadas en fase separada en23,6s. Ambos casos nuevos de Reportes/Metas aprobaron remotamente. Navegación sintética aprobada. CI frontend132488876869 confirma579 unitarias/66 archivos y build del head exacto. La duplicada push43608685066 fue cancelada intencionadamente;el commit intermedio2723795 se sustituyó antes del PR y no acredita este cierre.

Local final:69/69 E2E en6,6min,dos focales finales11,2s,TypeScript estricto y build488,56kB aprobados (presupuesto500kB). Permanecen avisos CSS Login4,30kB,Avisos4,49kB y automatic-bank5,02kB,sin errores de compilación. La última prueba de foco reproduce y evita la parada automática de Tab en la gráfica decorativa;la tabla numérica abre con teclado y conserva6 filas. Reportes mantiene etiquetas separadas de la tabla y gráfica desplazable cuando el texto/espacio lo exige. Metas usa1rem en campos/acciones,32px al200%,textos visibles breves y aria-label con el nombre completo;se conservan eventos,deshabilitados,ocultación y reglas financieras.

Auditoría final:24 vistas primarias por versión,con4 vistas USD adicionales,y4 recortes de gráfica;comparativa privada28 estados/56 imágenes en http://127.0.0.1:14345 . Selectores,imágenes y ajuste390px comprobados. Inicialmente el selector exacto Moneda del arnés no encontraba el nombre implícito;se corrigió y completaron ambos recorridos sin escrituras/errores JS. En oscuro320/200%,las etiquetas terminan71px antes del inicio del control de tabla (antes lo invadían11px). Ningún aporte,retiro,creación o cancelación enviados en los recorridos;perfiles/API ficticios y red externa bloqueada. No se extrapola navegación sintética a la lentitud real tras horas de inactividad.

PR277 conserva CI/Android aprobadas en9e573b0 y PR278 en c56395f. Develop sigue fe13575532c8c055fe699374660988a888b01f6f y main1fd9402bb40012aba4c894b81ecceb09dcfb48a1,remotos reconsultados. Sin merge,despliegue o instalación en el teléfono. PR271 no es ancestro del head final y permanece excluido. Mantener calendario aprobado,historial sin rediseño de estructura/datos y lentitud/logout aplazados. La valoración estética del propietario continúa con la comparativa;la comprobación física del tema final se retoma en QA aislada cuando vuelva el dispositivo.

Resultados posteriores registrados en checkout principal/planes locales/PR para conservar la CI del código final. Siguiente sección concreta:Compartidos y Avisos con contenido largo y paneles,usando datos ficticios. Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/REVISION_REPORTES_METAS_2026-11-14.md. PR279 publica e4ca4e3 con CI general/Android aprobadas;69 E2E locales,579 unitarias,132 E2E remotas y4 PWA separadas aprobadas. Continúa con Compartidos/Avisos,sin usar datos reales ni integrar PR271».
