# Ajustes de funcionalidades e interacciones de Kaptal

4 de octubre de 2026. Implementación posterior a la revisión del alcance entregado por el usuario.

## Cambios aplicados

- **Periodos reales:** Hoy y Últimos 7 días consultan fechas locales; Personalizado permite elegir inicio y fin. Mes Actual vuelve al mes actual y el swipe vuelve a navegación mensual. El backend utiliza las mismas fechas para ingresos/gastos, categorías y actividad reciente. El saldo disponible de las cuentas sigue siendo el saldo actual; los presupuestos continúan siendo mensuales. El historial completo sigue disponible en Ver Todo.
- **Dashboard consistente:** las respuestas antiguas ya no sustituyen un periodo más reciente; al recargar se limpian gráficos y selección. Un error de analítica muestra un aviso y evita conservar el gráfico anterior. El enlace por categoría usa las fechas elegidas.
- **Donut completo:** cuatro categorías principales y «Otros» para el resto, total real de la moneda seleccionada y porcentajes sobre ese total. Segmentos y centro admiten Enter/Espacio.
- **Captura:** un toque en el FAB abre Movimientos con el formulario manual y foco en el monto. Mantener pulsado inicia voz; al soltar se transcribe y se prepara una propuesta, que todavía requiere confirmación para guardarse. Una pulsación larga ya no dispara también el formulario manual.
- **Procesamiento cancelable:** Transcribiendo y Categorizando se conectan a sus peticiones y ambas tienen Cancelar. Cancelar detiene la suscripción del cliente y no confirma una propuesta. No promete detener el trabajo que un proveedor remoto ya recibió. Cerrar el panel cancela el procesamiento pendiente.
- **Micrófono:** barras calculadas a partir de la señal de audio, cierre de AudioContext, cancelación de frames/timers y liberación de pistas. Se descarta audio cuando se cancela el gesto y se ignoran respuestas de permisos de una grabación anterior.
- **Origen de captura:** campo persistente `metodo_captura` y respuesta `metodoCaptura`. Nuevas operaciones manuales/texto se marcan TEXTO; propuestas de voz confirmadas se marcan VOZ. Se conserva en respaldos/restauración y no se modifica al editar las notas. Registros anteriores sin origen muestran «No registrado»; no se reconstruye por palabras como WhatsApp. El enum admite WHATSAPP, pero no se añadió un endpoint de captura por WhatsApp ni se atribuye ese origen a las operaciones antiguas.
- **Categorías:** pulsación larga de 350 ms y arrastre con puntero táctil, destino destacado y persistencia al soltar. Cancelar no reordena. Se conserva drag de escritorio y botones para subir/bajar; el orden sigue siendo local por usuario.
- **Avisos:** toasts arriba, respetando el área segura del dispositivo.
- **Formulario manual:** fecha local y cuenta/categoría iniciales cuando las peticiones terminan después de abrirlo. El botón Registrar usa colores del tema con contraste legible también en oscuro.
- **Borrado:** nombre inequívoco «Eliminar mi cuenta» y advertencia de que también desaparece el historial compartido con la pareja. Se conservan ELIMINAR y reautenticación. No se ejecutó ningún borrado real.

## Decisiones sobre el alcance

Se conserva Spring en lugar de Appwrite, el teclado decimal del teléfono en lugar de construir un numpad, el calendario propio accesible y compartir/descargar PNG en lugar de prometer guardado directo en galería. No se añadió «vaciar finanzas y conservar cuenta»: la aplicación tiene libro contable, auditoría e historial compartido y esa operación necesita definir explícitamente qué conserva. La opción disponible se identifica como eliminar cuenta.

Se mantienen multimoneda, transferencias, cuentas, presupuestos, respaldo/restauración, importación CSV, categorías archivadas y privacidad de montos. La IA sigue requiriendo confirmación antes de guardar. No hubo migración de framework, commit ni despliegue.

## Validación

Resultados actuales y conteos: `replica/alcance-interacciones/verification.json`. Pruebas del frontend, pruebas del backend y compilación de producción; los tests adicionales cubren rangos, total con más de cuatro categorías y otra moneda, cancelación con respuesta tardía, pulsación larga, carga tardía del formulario y origen explícito.

Pasaron **158 pruebas del frontend en 19 archivos**, **213 pruebas del backend**, y la compilación de producción. Tras añadir la comprobación del origen TEXTO se volvió a ejecutar TransaccionServiceTest. También se conserva el origen VOZ al corregir la categoría de una propuesta y se cargan las categorías al abrir la captura. Matriz frente al texto original: `replica/alcance-interacciones/features-current.csv` y `parity-current.json`; la matriz inicial se conserva aparte.

Comprobación con Chromium y APIs interceptadas: móvil 390 × 844 claro/oscuro y escritorio 1280 × 900. Verifica total del donut, interacción de teclado, parámetros de Hoy y Personalizado, formulario desde FAB, cuenta inicial, contraste de Registrar, ausencia de desbordamiento horizontal y errores de página. Script reproducible y capturas en `replica/alcance-interacciones/`; usa el servidor de desarrollo en 127.0.0.1:14201. No equivale a probar micrófono físico, teclado/galería nativos, bot o datos de producción.

Persisten los dos avisos conocidos de presupuesto de tamaño del bundle inicial y CSS de login. No se aumentaron los límites. No hay script de lint en package.json; no se informa un lint inexistente como aprobado. No se midió cobertura de tests.

Bundle inicial actual: 584,91 kB frente a 500 kB; CSS de login: un byte por encima de 4 kB. `git diff --check` pasó. Se actualizaron pruebas de CORS que consultaban allowedOrigins para comprobar la aceptación/rechazo efectivo de orígenes con la configuración actual de patrones; no se modificó la política CORS.

El esquema del proyecto utiliza Hibernate `ddl-auto: update`: la columna de origen es nullable para aceptar operaciones y respaldos anteriores. Al publicar, backend y frontend deben actualizarse juntos; la base de producción no se modificó desde esta sesión.
