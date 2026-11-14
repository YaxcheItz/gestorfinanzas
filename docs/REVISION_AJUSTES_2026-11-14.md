# Ajustes: legibilidad y texto ampliado — 14 noviembre 2026

## Base y alcance

Continuación del propietario tras Compartidos/Avisos. Se reconsultaron develop fe13575532c8c055fe699374660988a888b01f6f y la dependencia90586cf687960ccb803559350433f65c5f07bfa8/PR280. CI43623272401 y Android43623272198 conservan completed/success. Rama nueva mejoras/ajustes-texto-ampliado desde origin/develop comprobado, incorporando90586cf por fast-forward. Worktree .local/worktrees/ajustes-texto-ampliado.

Se aplican redesign-existing-projects,ui-ux-pro-max,ponytail y playwright-cli para revisar primero la interfaz renderizada y corregir defectos demostrados; debugging-and-error-recovery para una carrera del arnés y ecc-verification-loop para el cierre. Angular21/Tailwind3 existentes,sin nuevas dependencias. Se conservan acciones,consentimientos,permisos y lógica de perfil,seguridad,WhatsApp,recurrencias y respaldo. No cambian los canales reales ni sus configuraciones.

## Hallazgos presentados y cambios

| Apartado | Antes | Corrección |
|---|---|---|
| Seguridad | Correo ficticio largo ensancha la página:684px a390/100% y1367px a320/200%,también en Android ficticio. | Ajustes permite envolver contenido largo,sin reducir su tamaño. |
| Resúmenes y perfil | A320/200% hay descripciones que invaden la columna del signo +;el texto junto al avatar solo dispone70px. | Se conservan las columnas del resumen y se ajustan las palabras;el encabezado del perfil puede apilarse. |
| Espacio al ampliar texto | Márgenes de40px y relleno de32px dejan174px interiores;la primera corrección evitaba recortes pero aún partía palabras comunes. | Hasta30rem,márgenes y rellenos horizontales de16px y enlaces con8px de relleno. No se reduce la fuente. Una regresión comprueba palabras completas como Presupuestos. |
| Más herramientas | Mínimo fijo210px desborda el espacio interno estrecho;en horizontal200%,demasiadas columnas fragmentan nombres. | Mínimo13.125rem limitado al100% disponible: conserva210px al100% y crece con la fuente. Se reserva espacio para la flecha. |
| Recurrencias | Notas extensas truncadas con puntos suspensivos. | Notas completas que envuelven,sin tocar importes,fechas,cuotas o acciones. |
| WhatsApp | Título18px,párrafos/etiquetas/botones14px,hint12px y guía13px no crecen al200%;error oscuro2,56:1. | Tamaños rem equivalentes:36/28/24/26px al200%,encabezado adaptable y botones limitados al ancho. Error con token de gasto/error del tema;contraste real>=4,5:1 en ambos temas. El teléfono ya crecía por la regla global y conserva ese comportamiento. |

## Verificación

Siete regresiones finales reproducen los fallos sobre el artefacto90586cf y pasan con los cambios. Incluyen ocho configuraciones:320/200% oscuro y claro,390/100% oscuro,1280/100% oscuro,375/200% oscuro y claro y844×390/200% oscuro y claro. Se comprueba geometría real,correo y notas completos,palabras de navegación sin partir,fuentes calculadas,teclado/estado del apartado y contraste. Android se simula solo para comprobar controles de seguridad y ausencia de cambios nativos.

El primer test de contraste podía leer el aviso anterior durante su actualización:una repetición diagnóstica falló1/3 con connected:false y color vacío. Se usan contextos independientes por tema,perfil cargado y el error inicial vigente,sin refrescar un nodo anterior. No se ignora el error ni se aumentan timeouts. La comprobación focal y las repeticiones finales se registran en el cierre. La ejecución integral intermedia se detuvo tras30 casos al corregir el espaciado;no acredita la versión final.

Auditoría:64 estados antes/después,128 capturas comparables;más64 vistas finales a375px y en horizontal200%. Incluye perfil/WhatsApp desconectado,verificado,pendiente y error;seguridad web/Android,apariencia,avisos,categorías,recurrencias,datos de respaldo,previsualización,información de borrado y su diálogo,chat informativo. La captura vuelve arriba para que la barra fija conserve su posición;el tema y su botón seleccionado corresponden al perfil ficticio. Cada estado de WhatsApp se vuelve a consultar para no capturar el estado anterior al navegar por fragmentos.

Antes:6 vistas con desborde del documento y33 con recortes de texto medidos. Al cerrar se verifican de nuevo todas las vistas finales. Contextos nuevos,service worker bloqueado,API interceptada y red externa bloqueada. Cero guardados y errores JS. Cada recorrido de64 vistas realiza4 POST ficticios de previsualización,respondidos dentro del arnés con datos inventados:esto no valida el formato de respaldo contra el backend ni restaura información. No se pulsa restaurar,exportar,eliminar,vincular,autoguardado o cambiar contraseña/tema/permisos.

Build final488,56kB aprobado,presupuesto500kB. Avisos CSS previos:Login4,30kB,Avisos4,53kB y automatic-bank5,02kB. TypeScript estricto aprobado.579 unitarias/66 archivos y focales aprobadas;regresión integral79 E2E y CI del commit final se registran al cerrar. Evidencia en frontend/.local/ajustes-before-final,ajustes-after-final,ajustes-extra,ajustes-focal-final,ajustes-regresion-before-final,ajustes-contraste-diagnostico,ajustes-contraste-final y ajustes-integral-final-version. No se suben capturas ni perfiles.

## Continuidad

Comparativa privada prevista: http://127.0.0.1:14353 . Publicar PR borrador hacia develop,verificar SHA remoto y CI del código final. Los resultados posteriores se mantienen en el checkout principal,planes locales y PR para conservar esa CI. Sin integración,despliegue o instalación. PR271 excluido;calendario aprobado,historial sin rediseño y lentitud/logout aplazados.

Siguiente paso: valorar Ajustes en la comparativa y revisar la coherencia visual de las secciones trabajadas. Para otro chat: «Lee AGENTS.md,docs/ESTADO_SESION.md,docs/PLAN_MAESTRO_KAPTAL.md y docs/REVISION_AJUSTES_2026-11-14.md. Revalida SHA/CI de mejoras/ajustes-texto-ampliado y revisa comparativa14353. Continúa con las comparativas y coherencia entre secciones usando datos ficticios,sin integrar PR271 ni desplegar».
