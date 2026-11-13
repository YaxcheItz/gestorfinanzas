# Chat adaptable y acciones solo en Inicio — 13 noviembre 2026

## Solicitud y base

El propietario pidió otro diseño para el chat, más agradable y mejor adaptado a la pantalla, recomendaciones útiles para esa superficie y retirar la barra inferior al salir del dashboard. La revisión genérica de teclado se reorientó a esta petición concreta; su worktree anterior permanece sin cambios de implementación.

Rama `mejoras/chat-pantalla-navegacion`, worktree `.local/worktrees/chat-redisenado`, creada desde develop remoto comprobado `fe13575532c8c055fe699374660988a888b01f6f` con dependencia documental `8fd7390b412373855d44f3242a9c60854a1eb6a3` por fast-forward. El código de aplicación base coincide con el main0.1.45 publicado. La app habitual ya instalada sigue0.1.45/código46; esta parte no genera una entrega ni modifica el teléfono.

Skills aplicadas: ui-ux-pro-max, redesign-existing-projects, angular-developer y playwright-cli. Se revisaron herramientas disponibles; no se añaden servicios, dependencias, fuentes descargadas ni cuentas externas para este cambio. Solo contratos y sesión ficticios en las pruebas.

## Diagnóstico renderizado y diseño

Antes: hoja pequeña con controles en filas separadas y espacio de conversación limitado. Su estado inicial usaba una altura menor que cambiaba al llegar mensajes. La barra de búsqueda/lápiz/micrófono se montaba globalmente: flotante en Inicio/Movimientos e insertada en otras pantallas. El contenido reservaba espacio inferior en todas las vistas autenticadas.

Ahora:

- Chat a pantalla completa en móviles hasta639px; en escritorio, panel centrado hasta46rem con altura adaptada al viewport visual. Se conserva `DialogViewportDirective`, que responde a cambios de tamaño/posición del viewport y bloquea el scroll de fondo. No se introduce otra gestión paralela del teclado.
- Cabecera compacta con volver, título contextual y acceso al formulario manual. La cabecera y el compositor quedan fuera del scroll de mensajes; el editor mantiene campos desplazables y acciones accesibles.
- Conversación más ancha, mensaje del usuario diferenciado con coral tenue, respuestas sin cajas anidadas y propuestas con jerarquía/acciones claras. Se mantienen temas, tipografía del sistema y tokens existentes. Se sustituyeron reglas específicas antiguas del panel en vez de añadir otra capa completa de sobrescrituras.
- Inicio con «Registrar gasto», «Registrar ingreso» y «Consultar gastos». Son las adiciones recomendadas e implementadas: preparan un texto editable, limpian errores anteriores y ponen foco; no envían ni guardan por pulsarlos. La IA y la voz conservan su consentimiento/flujo anteriores; no se añaden OCR, adjuntos, otro chat ni persistencia de borradores.
- Búsqueda/lápiz/micrófono solo en `/dashboard`, incluyendo query/hash. Fuera no se renderizan ni reservan padding inferior; se conserva el enlace de vuelta a Inicio, selector de lista y Configuración. Las acciones propias de cada sección permanecen.

Se conserva la revisión/confirmación para la captura escrita, edición de propuestas, error junto al compositor, texto/conversación en la sesión y su comportamiento al recargar. No se modifican cálculos, endpoints, almacenamiento, recepción bancaria, calendario o flujo de confirmación por voz. El historial solo pierde las acciones globales solicitadas: no se rediseña su lista ni sus datos.

## Pruebas y correcciones durante la revisión

Build Angular aprobado con los avisos CSS anteriores de Avisos4,49kB y automatic-bank5,01kB. Antes de implementar, la prueba visual anterior aprobó y produjo capturas de referencia. La primera versión del diseño pasó esa misma regresión; dos pruebas nuevas comprobaron navegación, ocho combinaciones claro/oscuro de320×640,390×844,390×400 y1280×800, propuestas/editor y que los inicios no envían.

La nueva prueba de texto200% reprodujo el envío por debajo del viewport (borde inferior697,52px sobre640). La cabecera secundaria crecía en exceso y aparecía un acceso al último mensaje incluso sin conversación. Se redujo la estructura móvil ocultando solo el subtítulo redundante, manteniendo el texto ampliado y evitando ese botón cuando no hay mensajes. Se conservó evidencia del fallo; después aprobó320×640/raíz200%, con scroll de los inicios y compositor dentro del viewport. No se redujo la fuente para esconder el problema.

La primera ejecución unitaria nueva falló en siete casos del arnés de Navbar por no esperar `TestBed.compileComponents()`; se corrigió su preparación. La suite completa posterior aprobó579 pruebas/66 archivos (571 anteriores,7 casos de rutas y1 de ejemplo sin envío). Después del último ajuste de plantilla se repitió la suite completa:579 pruebas/66 archivos aprobados, sin fallos.

Regresión focal final:6 E2E aprobados en1,4min. Tres son nuevos (navegación, diseño/ocho combinaciones y200%); los otros son chat anterior, controles/texto y dock/paginación. Se adaptaron únicamente las expectativas de presencia de la barra que el usuario pidió retirar, conservando las comprobaciones de contraste, foco, overflow y contenido. El test anterior de chat sigue comprobando propuesta/error/editor, conservar texto al cerrar y vacío tras recargar.

TypeScript estricto del E2E nuevo y diff check aprobados antes del commit. No hay cambios de dependencias ni backend. Pruebas con API interceptada: ocho POST sintéticos de propuestas dentro del arnés; cero escrituras al backend o cuentas reales. No se guardan movimientos. La auditoría frontend final y sus cuatro pruebas aprobaron:sin vulnerabilidades conocidas en producción ni desarrollo en esa consulta. No se ejecutó un lint frontend ni cobertura nuevos.

## Evidencia y límites

Evidencia privada en `frontend/.local/` de este worktree: `chat-before`, `chat-after`, `chat-design-results`, `chat-text-before-fix`, `chat-responsive` y registros de build/unitarias/seguridad. Las capturas200% comprueban el tamaño CSS, no equivalen a modificar la escala del sistema Android.390×400 verifica altura reducida, no acredita teclado IME real. Al consultar ADB el teléfono no aparece conectado; se solicitó reconexión opcional y se continúa localmente. No hay QA física del diseño nuevo ni aceptación visual del propietario todavía.

El código se sube en su rama para verificar CI general de su SHA exacto. Los resultados posteriores se anotan en el checkout principal y planes locales sin pushes sucesivos que cancelen la ejecución. Publicar/instalar una nueva versión requiere una etapa posterior; no se presenta0.1.45 como si incluyera estos cambios.

Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/CHAT_PANTALLA_NAVEGACION_2026-11-13.md, además de planes locales. Revalida SHA/CI de mejoras/chat-pantalla-navegacion. Sigue con revisión visual del chat y teclado Android usando QA separada si hay dispositivo, antes de preparar la siguiente entrega. Barra inferior solo en Inicio; conservar datos reales, calendario e historial/lentitud/logout aplazados, chat sin borradores y excluir PR271».
