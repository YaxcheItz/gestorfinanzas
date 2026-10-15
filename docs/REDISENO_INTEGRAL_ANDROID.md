# Rediseño integral de Kaptal para Android

## Especificación vigente: Inicio dominante y coral

El usuario rechazó la estructura de dashboard y aportó una guía detallada. La corrección de la misma etapa se rige por [PLAN_UI_MONAI.md](PLAN_UI_MONAI.md). Este apartado sustituye las descripciones visuales anteriores; se conservan como historia de la entrega.

| Antes | Ahora | Propósito |
|---|---|---|
| Tarjeta de saldo actual y deuda en primer plano | Gasto real del periodo centrado sobre el fondo | Entender el consumo al abrir |
| Barra inferior permanente | Cabecera contextual y micrófono coral flotante | Priorizar captura y liberar espacio |
| Barras de presupuesto con mucho texto | Barras de gasto por categoría, emoji e importe externo | Ver también categorías sin presupuesto |
| Datos de cuentas siempre visibles | Vista simple o detallada, saldo de cuentas desplegable | Separar saldo actual del flujo del periodo |
| Categorías Lucide y filas en tarjetas | Emoji del sistema y filas ligeras | Reconocimiento y menor ruido |
| Tabla de historial en escritorio | Lista agrupada en todos los anchos | Mantener una experiencia coherente |
| Resumen de página siempre abierto | Resumen opcional y total diario por moneda | Evitar métricas repetidas |

Se conserva el tema elegido; el sistema visual maestro es claro/coral y tiene variante oscura neutra. Fuente nativa del sistema, vidrio moderado sólo en controles, radios de hoja de 30 px y FAB de 64 px. No se incorporaron fuentes licenciadas ni imágenes de MonAi.

Las barras usan `/dashboard/analitica` con el mismo rango que el resumen y se ordenan por gasto en la moneda seleccionada. Colores estables por categoría; importes y alturas se ocultan con privacidad. Tap abre movimientos filtrados; mantener pulsado, clic contextual o el botón de opciones abre acciones. El registro desde allí selecciona la categoría sin guardar nada hasta confirmar. La hoja de periodo conserva sólo rangos realmente soportados.

El historial muestra totales de los registros cargados del día, excluyendo transferencias y saldos iniciales. No mezcla monedas y avisa cuando la paginación limita el total a esa página. El resumen de página sigue disponible como desplegable. La confirmación, idempotencia, CSV, recurrencias y controles financieros anteriores se conservan.

La entrega no implementa listas múltiples, etiquetas, periodos de nómina, autoguardado, compacción física del gráfico al scroll, biometría, haptics nativos ni integraciones externas. Se especifican por pantalla y por etapa en el plan; no se añaden toggles o planes de suscripción ficticios.

Verificación vigente: 275 pruebas frontend/35 archivos, dos E2E, build 457.76 kB sin avisos. Revisión visual 4300: 161 comprobaciones en cinco tamaños móviles; dist: 130 con offline; interacción 393/1280: 64. [Informe consolidado](../replica/rediseno-integral/monai-final/verification.json). Las cifras inferiores corresponden a revisiones anteriores.

## Revisión vigente del inicio y referencias

Se conserva la rama de esta entrega para corregir su diseño. La descripción y cifras de la primera entrega inferiores son históricas.

| Antes | Ahora | Motivo |
|---|---|---|
| Más en la cabecera y cinco accesos inferiores | Añadir en cabecera; Inicio, Actividad, Reportes y Más abajo | Evitar amontonamiento y mantener captura accesible |
| Opciones secundarias en desplegable | Panel modal nativo con secciones, cierre exterior y Escape | Foco contenido y devolución al activador |
| Presupuestos aplanados | Barras verticales de categorías con importe, límite y restante | Recuperar la referencia visual solicitada |
| Porcentaje visible con privacidad | Importe, proporción y valores ARIA ocultos | No revelar el gasto mediante el gráfico |
| Controles, banners y acciones repetidos | Periodo compacto, saldo y deuda diferenciados, actividad reciente | Reducir ruido sin cambiar la contabilidad |

Estilos canónicos del inicio en `frontend/public/styles/home.css`; navegación en `frontend/src/design-system.css`. Se retiraron reglas anteriores de esos componentes para evitar seguir acumulando sobrescrituras. Temas claro y oscuro conservados.

Verificación de esta revisión: build de producción sin avisos, 460.40 kB iniciales; 271 pruebas frontend/35 archivos y dos E2E seleccionados correctos. La prueba nueva verifica que privacidad también oculta la proporción del presupuesto y los valores accesibles. Evidencia de navegador en `replica/rediseno-integral/inicio-monai/`: trece rutas, cuatro anchos, dos temas, captura reducida y cinco hojas disponibles offline. Chromium emulado con API sintética; no Android físico. Backend sin cambios adicionales en esta revisión.

Nueva referencia funcional principal: [MonAi/Kesef y matriz](../replica/monai-kesef/recon.md). Se documentan diferencias de plataforma y la arquitectura propuesta para avisos bancarios, correo, SMS y acceso desde ajustes rápidos. Estas integraciones no están implementadas ni se han solicitado permisos a cuentas privadas. Su etapa requiere rama nueva después de integrar esta entrega.

Fecha: 14 de octubre de 2026.
Rama: `mejoras/rediseno-integral-android`.
Base: `develop` / `origin/develop` en `4fb43a115efb738f6a090cac79fd79c15ef0edc6`, comprobados al crear la rama y mediante consulta remota al cerrar.

## Entrega

Se implementa la primera entrega del plan aprobado: interfaz oscura y sobria, navegación, captura, reportes y rendimiento. Se conservan Angular 21, Java 21/Spring Boot y PostgreSQL; no hay nuevas dependencias, migraciones de datos ni cambio de alojamiento.

- Tema carbón y verde moderado, con variantes claras y respeto por las preferencias guardadas. Los perfiles nuevos de registro y Google nacen en oscuro; los existentes no cambian. El esquema y sus defaults no se modifican.
- Navegación con Inicio, Actividad, Añadir, Planes y Reportes. Menú secundario para cuentas, categorías, compartido, libro diario, asistente y ajustes; cierre con Escape y al navegar. Marca visible y enlace para saltar al contenido.
- Inicio con saldo por moneda, deuda y saldo neto separados, flujos del periodo, presupuestos compactos y actividad reciente. La analítica se consulta en Reportes; se retira la petición de analítica redundante de Inicio.
- Nueva ruta protegida `/reportes`: selección de mes y moneda, comparación con el mes anterior, categorías y evolución de seis meses. Reutiliza las tres APIs de dashboard. Sin IA ni nuevos contratos backend. La tabla ofrece una alternativa textual al gráfico; ocultar importes también oculta las barras.
- Las solicitudes de reportes se cancelan al cambiar de periodo o de usuario; se eliminan cifras anteriores durante la recarga y se ofrece reintento ante fallo de conexión.
- Plantillas de Inicio y Actividad separadas de sus componentes TypeScript. Los servicios, formularios avanzados, importación CSV, MSI y recurrencias se conservan.
- Chat y formulario rápido se cargan mediante `@defer`, en reposo o ante la primera solicitud. Se conserva el evento y su payload hasta montar el componente; no se reproduce un evento ya atendido. Logout y cambio de cuenta descartan solicitudes pendientes.
- Estilos por función en `frontend/public/styles/`, aplicados una sola vez mediante una lista cerrada de archivos locales. El service worker los incluye en su grupo prefetch para conservar la disponibilidad offline. Los tokens de color compartidos quedan definidos en la hoja de tema.
- Colores del navegador, manifiesto y acceso adaptados al tema. Se mantienen IndexedDB, revisión de propuestas, idempotencia, sincronización y guardado de borradores antes de actualizar la PWA.

## Verificación

- Frontend: 272 pruebas en 35 archivos, todas correctas.
- Producción: build correcto, carga inicial de 461.89 kB frente a 698.63 kB en la base; aproximadamente 34 % menos. Sin avisos de presupuestos de bundle o CSS. No se aumentaron los límites.
- Esta cifra describe la carga inicial calculada por Angular: los estilos por pantalla y los componentes diferidos se descargan adicionalmente, y la PWA realiza prefetch en segundo plano. No es una medición de LCP ni una reducción equivalente del tráfico total.
- Backend: tres pruebas `AuthServiceTest` correctas con perfil de pruebas/H2, incluyendo registro oscuro, Google nuevo y conservación del tema existente. No se repitió toda la suite backend.
- E2E seleccionados: registro/repetición con cuentas y monedas, recuperación de reportes ante 503 y chat con almacenamiento offline. Backend real de prueba/H2; no producción.
- Revisión visual automatizada: Chromium con APIs sintéticas; trece rutas en claro/oscuro, anchos de 360, 390, 768 y 1280 px, captura con viewport reducido y recarga offline con service worker real. Evidencias finales en `replica/rediseno-integral/`.
- `git diff --check` y comprobación de sintaxis del script de revisión.

Reproducción: `npm run build`, `npm test -- --watch=false`, `node scripts/review-design.mjs` desde `frontend`. Para E2E puede usarse `E2E_FRONTEND_PORT` si 14200 está ocupado; se comprobó 14220 sin detener el servidor existente del usuario.

La revisión no sustituye pruebas con teclado virtual, TalkBack y micrófono en Android físico, ni Safari/Firefox. No se han comprobado despliegues, datos reales, notificaciones del proveedor ni CI remoto. No hubo commit, push ni publicación.

## Siguientes etapas

Tras revisar esta entrega: tarjetas y previsión; captura/conciliación y automatización; metas de ahorro; notificaciones fiables; fuentes bancarias y Wallet comprobadas. Cada etapa requiere su especificación y una rama nueva desde `develop` integrado y actualizado. No se implementan esas conexiones ni se contratan servicios en esta rama.

Convex y cambios de lenguaje no se incorporan. Cloudflare/Fly.io se mantienen como evaluación posterior basada en coste y mediciones. Las skills de Everything Claude Code ya disponibles se reutilizaron; no se reinstalaron herramientas ni se activaron hooks nuevos.

## Revisión de interfaz y menú — 14 de octubre de 2026

Correcciones solicitadas sobre la misma entrega y rama, sin cambios financieros:

| Antes | Después | Motivo |
| --- | --- | --- |
| Skip link mostrado con cualquier foco y `href` relativo al base | Recortado salvo foco de teclado; mueve el foco sin recargar | Evitar texto flotante y pérdida de estado |
| Menú plano y “Planes” | Presupuestos; menú secundario con herramientas agrupadas | Dar prioridad a las acciones habituales |
| Cuentas/Ajustes y tarjeta de Reportes repetidos en Inicio | Accesos mediante la navegación compartida | Reducir ruido |
| Fecha decorativa, flechas y mensaje de carrusel sobre una rejilla | Cabecera compacta y presupuestos sin falsas acciones de desplazamiento | Ajustar controles al comportamiento real |
| Eslóganes en Reportes y captura | Títulos directos y ayudas necesarias | Reducir texto sin quitar advertencias financieras |

Barra principal: Inicio, Actividad, Añadir, Presupuestos y Reportes. Menú “Más”: Cuentas, Compartido, Asistente, Organizar y Ajustes. Organizar contiene Categorías, Recurrentes y Libro diario; el último se considera una vista de detalle contable, no una acción cotidiana. No se eliminan funciones ni rutas.

El menú cierra al tocar fuera o navegar. Escape lo cierra y devuelve el foco al activador; sus grupos se reinician cerrados. La altura del menú está limitada al viewport.

Verificación final de la revisión: 271 pruebas frontend en 35 archivos, dos E2E seleccionados contra H2 y 121 comprobaciones de navegador en trece rutas con cuatro anchos y ambos temas. Estas comprobaciones incluyen teclado, enlace al contenido, menú, captura y recarga offline con los estilos en caché. Build sin avisos, carga inicial 463.92 kB (los límites se mantienen). El test de la tarjeta retirada de Inicio se elimina; el acceso a Reportes sigue comprobado mediante la navegación real.

Evidencias separadas de la primera entrega: `replica/rediseno-integral/revision-menu/`. La comprobación del servidor del usuario en 14200 confirmó que el salto mantiene `/login` y enfoca `main-content`; no se detuvo ese servidor. No se repitió la suite backend, no se modificó producción y no hubo commit ni push. No sustituye Android físico/TalkBack.
