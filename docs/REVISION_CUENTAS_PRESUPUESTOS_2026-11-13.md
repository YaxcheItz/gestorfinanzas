# Revisión visual de Cuentas y Presupuestos — 13 noviembre 2026

## Base y alcance

Continuación autorizada con «ok si sigue». Se confirmó PR276 en328983f1af8f03ac0014dea41ff3f0dd2729464b, CI general43547268394 y Android43547268297 aprobadas; sin merge o instalación. Nueva rama mejoras/detalle-presupuesto-texto-ampliado, worktree .local/worktrees/detalle-presupuesto-texto-ampliado, creada desde origin/develop fe13575532c8c055fe699374660988a888b01f6f comprobado contra el remoto, e incorporando328983f por fast-forward. No se reutiliza la rama anterior ni se integra PR271.

Skills aplicadas: redesign-existing-projects para diagnóstico renderizado y cambios puntuales, playwright-cli para recorridos aislados; se mantienen las pautas de cambios mínimos y verificación. GitHub se usa para PR y CI. No se añaden dependencias o servicios.

## Hallazgos por sección

| Sección | Observación renderizada | Resultado |
|---|---|---|
| Cuentas | Tarjeta de crédito ficticia con nombre largo, deuda, disponible, fechas y cashback; editor, campos y pie. | Paleta oscura coherente, sin verdes inesperados o desbordes en las vistas comprobadas. Sin cambio del código de Cuentas. |
| Presupuestos: encabezado del detalle | A320px/200%, el botón de cerrar sobresale; scrollWidth330 frente a clientWidth318 en el diálogo inicial. Con lista de nombre largo el encabezado exige más espacio. | Fila que puede envolver, texto que puede encoger y partir, título/etiqueta envolventes y botón sin encogimiento. Se conserva44×44 mínimo y foco al cerrar. |
| Presupuestos: totales | Dos columnas fijas al200% parten importes grandes en múltiples fragmentos. | Columnas adaptables a la fuente y espacio disponible: una columna al320/200% y dos cuando caben. No se reduce el tamaño de texto ni se cambia el importe. A200% algunos importes aún pueden ocupar dos líneas. |
| Diálogos oscuros | La capa bg-slate-900/60 tiñe de azul la pantalla detrás del diálogo. | Esa utilidad usa negro al60% solo en oscuro; conserva la opacidad y la paleta del modo claro. |
| Presupuestos: Cerca del límite | Fondo amber-100 claro con texto ámbar suave en oscuro; contraste medido1,5504:1. | Fondo mezclado con la superficie oscura y el token de advertencia; contraste final7,5143:1. Se comprueban texto de normal/cerca/excedido en claro y oscuro, sin bajar el umbral4,5:1. |

Se presentaron los hallazgos antes de corregirlos. Los verdes semánticos del modo claro y los colores de categorías elegidos por el usuario se conservan. No se alteran cálculos, límites financieros, APIs, guardados ni permisos.

## Evidencia y verificación

Recorrido de24 capturas: seis vistas (cuenta, editor/cabecera, editor/pie, presupuestos poblados, detalle y modificación de límite) en390px oscuro,1280px oscuro,320px/200% oscuro y390px claro. Contratos ficticios, sesión/perfil nuevos, service worker bloqueado y red externa bloqueada; todas las escrituras se interceptan y rechazan. Cero escrituras y errores JS en el recorrido. Las capturas finales de diálogo se limitan al viewport real, evitando atribuir el tamaño de una captura full-page al teclado o a la pantalla física.

Prueba nueva: cierre visible y contenido dentro del diálogo, área táctil, cierre con retorno del foco, totales apilados al200%, fondo neutro oscuro y fondo claro conservado. Se incluye categoría/lista de nombres largos,320px con texto200% en ambos temas,390px y1280px oscuros. La prueba falló primero por el fondo azul recibido y después del ajuste aprobó. Auditoría inicial del encabezado también registró el desborde. Pruebas de widgets ampliadas para medir los tres avisos: el selector inicial con anclas no contemplaba espacios de plantilla; corregido el selector, claro aprobó y oscuro reprodujo1,55:1 antes de cambiar CSS.

La primera regresión integral se interrumpió tras47 casos aprobados porque el nuevo fallo de contraste requería otro cambio; no se presenta como resultado final. Resultados del build, pruebas focales finales,66 E2E y CI del SHA publicado se registran al concluir en estado/plan y PR, sin pushes documentales posteriores sobre la rama de código.

Evidencia inicial: .local/worktrees/tema-oscuro-formulario/frontend/.local/revision-cuentas-presupuestos y cuentas-presupuestos-before-crop. Evidencia de esta rama: frontend/.local/detalle-final, aviso-final, cuentas-presupuestos-final y detalle-integral-final. No se suben imágenes, APKs o datos ficticios de sesión a Git.

## Continuidad

Teléfono desconectado: no se instala una APK ni se toca la app habitual0.1.45/código46. Pendiente comprobar físicamente el tema final cuando vuelva el dispositivo, reconstruyendo QA aislada desde el SHA vigente. No es una entrega a producción. Se conserva calendario aprobado, estructura/datos del historial sin rediseñar y lentitud/logout aplazados.

Siguiente sección: Categorías y Etiquetas con sus editores/selecciones, sobre la paleta vigente y usando datos ficticios. La valoración estética del propietario continúa con las comparativas; esta revisión no certifica todos los estados de la aplicación.

Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/REVISION_CUENTAS_PRESUPUESTOS_2026-11-13.md. Revalida SHA/CI de mejoras/detalle-presupuesto-texto-ampliado y sigue con Categorías/Etiquetas. Teléfono desconectado; no usar finanzas reales ni integrar PR271».


Build final488,49kB aprobado;1 E2E de detalle/4 configuraciones y2 E2E de avisos claro/oscuro aprobadas. TypeScript estricto de ambos specs aprobado; nueva regresión integral66 casos en curso. Avisos oscuros medidos: normal7,37:1,cerca7,51:1,excedido4,57:1.


Publicación comprobada:9e573b0958adef533c57027fa66c2ddd1e205ee7,PR277 borrador hacia develop,https://github.com/YaxcheItz/gestorfinanzas/pull/277 . CI general43552587091 y Android43552587113 en curso. Worktree de código limpio; comparativa24estados/48imágenes enhttp://127.0.0.1:14337 . La regresión integral66 sigue en curso.


Validación local final de9e573b0:66/66 E2E aprobadas en4,4min en frontend/.local/detalle-integral-final; auditoría28 combinaciones de texto/foco sin fallos en su alcance. TypeScript estricto repetido tras los últimos cambios de ambos specs,aprobado. CI frontend132318150210 aprobó build,579 unitarias/66 archivos y consulta de dependencias sin vulnerabilidades conocidas. Comparativa14337:24 estados/48 imágenes cargan correctamente,ajuste390px comprobado,imágenes móviles a escala real. El404 inicial era solo favicon local,se añadió icono embebido y la recarga quedó sin error. Cero escrituras y errores JS de aplicación en los recorridos. CI general43552587091/Android43552587113 en curso;duplicada push43552553336 cancelada tras verificar SHA/evento y ejecución PR.
