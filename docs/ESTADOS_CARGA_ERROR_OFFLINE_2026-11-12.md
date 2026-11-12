# Estados de carga, error y recuperación — 12 noviembre 2026

Rama `mejoras/estados-carga-error-offline`, worktree `.local/worktrees/estados-carga`. Creada desde `origin/develop` `74a85bb60a7301e38198fa7245d817d57d85f82b`, comprobado con fetch/ls-remote, e incorpora por fast-forward `d01baf58dacca5706a83833ffeafc6e5db7d718d` de contraste/teclado. Conserva las dependencias anteriores. No se integra a develop/main ni se instala una APK.

Skills: angular-developer para respetar los patrones existentes, ponytail para cambios mínimos, debugging-and-error-recovery para reproducir fallos y ecc-verification-loop para verificarlos. Se reutilizan Playwright, Chromium y el fixture sintético local; no se agregan dependencias ni conexiones externas.

## Hallazgos y correcciones

| Sección | Evidencia comprobada | Corrección |
|---|---|---|
| Etiquetas | Tras fallar la lectura aparece el error, pero no hay acción para volver a consultar. | Botón de reintento de lectura; conserva el nombre escrito. No reenvía creaciones ni eliminaciones. |
| Metas | Al reintentar permanecen simultáneamente el error anterior y el estado de carga. | Limpia el error al iniciar una lectura nueva; conserva el formulario y vuelve a mostrar el error si la nueva lectura falla. |
| Avisos | Una respuesta HTTP 200 con `success:false` y datos nulos se interpreta como bandeja vacía. | Verifica éxito y datos antes de sustituir el contenido. Muestra el error y permite recargar sin registrar dinero. |
| Pareja | El texto de carga no tiene estado accesible anunciado. | Skeleton compartido con `role=status`, nombre accesible y contenido decorativo oculto a lectores. |
| Cuentas, Categorías y Presupuestos | Mensaje y reintento compiten por la misma fila con raíz 200%; Cuentas llega a399px y Presupuestos a412px en viewport320. | Las filas de error permiten envolver texto y acción. |
| Libro diario | Los campos nativos y el selector ensanchan la columna; viewport320/raíz200% llega a367px. La vista poblada también desborda en la paginación. | Columna con mínimo cero, campos reducibles y paginación adaptable con contador separado. La tabla mantiene su desplazamiento horizontal interno. |
| Reportes | Mes fuerza un ancho de422px; paneles poblados y leyenda no caben al ampliar el texto. | Campos reducibles, rejilla con mínimo cero y desglose/leyenda adaptativos. El mes conserva espacio propio al faltar ancho. |
| Presupuestos poblados | Cabecera/acciones y el mínimo intrínseco de la tarjeta fuerzan324px en viewport320. | Rejilla de una columna reducible, acciones y cifras secundarias en filas adaptativas. Se verifica el desplegable abierto mediante teclado y sus límites horizontales. |

Los cambios afectan presentación, estado de lectura y validación de respuestas de Avisos. No cambian fórmulas, importes, saldos, endpoints de escritura, sincronización o autenticación.

## Matriz y evidencia

- Nueve secciones: Cuentas, Presupuestos, Categorías, Etiquetas, Metas, Libro diario, Pareja, Reportes y Avisos.
- Cada una comprueba lectura detenida con indicador de carga, HTTP503, reintento detenido sin error/vacío anterior, HTTP200 con `success:false`, recuperación a vacío confirmado, desconexión y recuperación. La primera prueba vacía no implica ausencia de datos reales: todo se intercepta.
- La desconexión comienza después de cargar la aplicación: Chromium pasa a offline (`navigator.onLine=false`) y la petición ficticia se aborta con `internetdisconnected`. Se restablece la conexión y se reintenta con botón/Enter. No demuestra arranque PWA sin conexión ni recuperación de una API o teléfono reales.
- Nueve casos adicionales revisan contenido poblado en390×844 claro,320×844 oscuro/raíz200% y1280×844 claro: cuentas, categorías propias, etiquetas, metas, presupuestos, asientos con Debe/Haber, avisos, pareja con aportes/gasto y reportes. No se ejecutan las operaciones mostradas.
- El menú de Presupuestos se abre y cierra con Enter y se comprueba que la acción quede dentro del viewport, sin pulsar Eliminar. Etiquetas y Metas conservan texto ficticio durante los reintentos, sin persistirlo tras recargar.
- API simulada en contextos nuevos, service workers bloqueados, destinos externos abortados y escrituras inesperadas rechazadas por el fixture y por aserciones. Sin acceso a sesiones, credenciales o finanzas del propietario.

Artefactos locales en `.local/worktrees/estados-carga/frontend/.local/`: `estados-before`, `estados-geometry-before`, `poblados-geometry` y `estados-poblados-final` conservan fallos reproducidos; `estados-poblados-cierre` contiene18 casos aprobados. `regresion-cierre` guarda los30 acumulados aprobados en una ejecución. `ajustes-finales` contiene los4 casos repetidos después de los últimos cambios de Reportes/Etiquetas, con capturas del selector de mes. Registros de build/unitarias y capturas por escenario en ese directorio. No se publican registros ni capturas locales.

## Verificación

Build final y569 unitarias aprobados. Los18 E2E nuevos aprobaron juntos y la regresión acumulada aprobó los30 casos en una ejecución. Después se hicieron dos ajustes exclusivos de Reportes/Etiquetas (ancho del mes y reintento solo de lectura): build,569 unitarias y sus4 E2E se repitieron y aprobaron. No se volvió a ejecutar el resto de los30 después de esos dos cambios. TypeScript estricto de las dos pruebas nuevas aprobado. Sin lint configurado ni medición nueva de cobertura. Continúan los avisos CSS de Avisos4,49kB y automatic-bank5,01kB frente a4kB.

```text
npm run build
npm test -- --watch=false
npx --no-install playwright test --config playwright.estados.config.ts
npx --no-install playwright test --config playwright.revision-integral.config.ts
```

Se corrigieron fixtures antes de evaluar el resultado: Categorías usa `/categorias/mias`, el vacío del Libro diario se localiza por su texto real y las respuestas de Avisos incluyen el indicador `success` del contrato. Dos pruebas unitarias antiguas omitían ese indicador; sus fixtures se corrigieron y la suite completa aprobó. No se debilitó la comprobación nueva para aceptar una respuesta fallida.

También se corrigió el alcance de `docs/CONTRASTE_TECLADO_2026-11-12.md`: la etapa anterior había documentado Categorías como pobladas, aunque su fixture devolvía vacío para `/categorias/mias`. Esta etapa sí sirve y comprueba expresamente categorías propias pobladas.

## Límites y siguiente etapa

No es una auditoría integral de accesibilidad. A raíz200% los importes grandes pueden saltar a varias líneas y las tablas conservan scroll horizontal interno. El selector nativo de mes ya no queda comprimido a su icono, pero su texto completo (incluido el año) aún puede recortarse a320/200%; revisar los campos nativos de fecha en otra etapa. La simulación no mide disponibilidad real ni persistencia offline. Configuración y sus apartados, estados especiales del detalle/editor y permisos adicionales aún requieren revisión propia. Contraste de bordes/iconos/selecciones, aceptación visual y Android/TalkBack/teclado físico/áreas seguras siguen pendientes. CI remota no comprobada; sin integración, despliegue ni instalación.

Conservar calendario aprobado, historial aplazado, chat temporal sin borradores persistentes, exclusión de PR271 y aplazamiento de lentitud/logout.

Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md, docs/ESTADOS_CARGA_ERROR_OFFLINE_2026-11-12.md y planes/prompts locales. Crea rama nueva desde develop remoto comprobado e incorpora la dependencia de esta etapa. Sigue con lectura, errores y teclado de los apartados de Configuración usando datos ficticios; después contraste de bordes/iconos y accesibilidad Android aislada cuando corresponda».
