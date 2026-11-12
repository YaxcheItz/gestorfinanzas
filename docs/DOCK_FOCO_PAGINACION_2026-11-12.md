# Dock, foco y paginación — 12 noviembre 2026

Rama `mejoras/dock-foco-desplazamiento`, creada desde origin/develop 74a85bb y con bf6931c incorporado por fast-forward. Skills: mobile-native y ecc-verification-loop; Playwright local para evidencia renderizada. Sin acceso a cuentas, movimientos o sesión reales.

## Hallazgos y cambios

| Prioridad | Evidencia comprobada | Cambio |
|---|---|---|
| Alta | En Movimientos, enfocar tarjetas mientras se recorre una lista larga permite que su parte inferior quede detrás del dock. Comparación a390×844: varios controles enfocados se solapan antes y ninguno después. | Scroll-padding inferior100px y superior76px, más áreas seguras, sólo mientras existe dock flotante. Protege el destino del desplazamiento sin cambiar tarjetas ni posición del dock. |
| Media | A320×640 y fuente raíz200%, Anterior/Siguiente estaban recortados internamente aunque document.scrollWidth no superase el viewport. | Paginación adaptativa por filas; contador en fila completa y botones que se apilan al faltar ancho. |
| Media | El SVG blanco del micrófono sobre #FF746B da2.64:1. | Símbolo #111111 sobre el mismo coral:7.16:1, comprobado en estilos calculados claros/oscuros. |

Referencia: [W3C, contraste no textual1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), umbral3:1 para información visual necesaria de controles. El cálculo usa colores CSS sin antialiasing.

## Verificación y límites

- La reserva de espacio existente al fondo ya permite alcanzar últimos movimientos y paginación; no se confirmó un bloqueo general al final. La superposición momentánea mientras se desplaza sigue siendo parte del dock flotante. La corrección se centra en controles enfocados/destinos de desplazamiento.
- Se descartaron mediciones hechas durante scroll suave y sobre un botón deshabilitado que no recibía realmente foco. Comparación repetida con movimiento reducido y document.activeElement comprobado; se detectó y corrigió el fallo real.
- Build final aprobado. Suite acumulada de8 E2E aprobada con scroll-padding; tras últimos cambios exclusivos de icono/paginación, build y caso focal repetidos y aprobados. Este caso recorre Inicio/Movimientos a390×844,320×640/200%,390×480 oscuro y1280×800; verifica controles enfocados sin intersección con botones flotantes, Tab dentro del contenido, ancho de botones, ausencia de overflow y errores JS, y contraste del micrófono≥3.
- Las569 pruebas frontend se aprobaron en la etapa anterior; no se repitieron para este cambio CSS. Sin lint configurado ni nueva medición de cobertura. Avisos de presupuesto CSS existentes: Avisos4.49kB y automatic-bank5.01kB frente a4kB, pendientes.
- Fixture de20 movimientos ficticios, API interceptada y conexiones externas bloqueadas. No se guardó ningún movimiento ni se alteraron saldos. No hay cambios en backend o cálculos.
- Evidencias finales: `.local/worktrees/dock-foco/frontend/.local/dock-final-corregido/dock-local-dock-y-contenido-con-datos-ficticios/`, capturas por tamaño/pantalla y geometry.json. Comparación inicial guardada en frontend/.local/dock-comparacion.txt; evidencia anterior de paginación en frontend/.local/dock-final/. Los archivos locales no son parte de Git.

Pendientes: contraste de otros controles/textos, recorrido completo con teclado y estados sin conexión/carga en secciones restantes; validar foco con movimiento normal y TalkBack/teclado/áreas seguras en Android aislado. Altura reducida de Chromium no equivale a teclado real. No se reconsultó la versión instalada ni CI remota. No instalación, publicación o integración a develop/main.

Continuar leyendo AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md, este informe y los planes/prompts locales. Crear nueva rama desde develop remoto comprobado, incorporar esta dependencia y seguir contraste/foco por secciones. Preservar calendario, historial aplazado, sesión temporal de chat sin borradores persistentes y exclusión dePR271.
