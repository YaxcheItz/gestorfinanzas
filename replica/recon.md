# Referencia visual: MonAi → Kaptal

Objetivo autorizado: dar a la aplicación existente una apariencia inspirada en Expense Tracker - MonAi de Florian Vates. Stack conservado: Angular 21, Tailwind y backend Spring Boot.

Fuentes públicas: [sitio oficial](https://www.get-monai.app/index.html), [App Store](https://apps.apple.com/us/app/expense-tracker-monai/id6447112647), capturas oficiales `hero-en.webp`, `minimalist-en.webp`, `manual-en.webp` y `voice-en.webp` en `images/mockups/`. Las capturas se usaron como referencia de lectura; los recursos de MonAi no se incluyeron en el frontend.

## Observaciones visuales

- Balance grande centrado sobre fondo claro, sin una tarjeta pesada.
- Ingresos y gastos dentro de un control compacto y redondeado.
- Presupuestos en columnas de tonos pastel, con límite punteado y llenado proporcional.
- Actividad en filas suaves, con categoría, importe y fecha.
- Controles flotantes discretos; micrófono separado como acción principal.
- Espaciado generoso y jerarquía tipográfica sencilla.

Estas son observaciones de las capturas públicas, no especificaciones internas de MonAi. No se examinó una cuenta privada ni se verificó paridad funcional.

## Auditoría del estado anterior de Kaptal

La aplicación ya tenía captura por voz/texto, dashboard, categorías, presupuestos, analítica y navegación móvil. Las hojas de estilo acumuladas mostraban superficies negras dentro del tema claro, un gradiente de balance oscuro y el micrófono sobre la navegación. Los códigos de iconos de categoría se imprimían como texto en los movimientos.

## Implementación

- Se conserva la marca Kaptal y la fuente Manrope instalada.
- Nueva hoja `frontend/src/monai-theme.css`, cargada después del CSS existente, con tokens para temas claro y oscuro.
- Balance centrado, resumen compacto de ingresos/gastos y controles de periodo/moneda.
- Presupuestos al comienzo del dashboard, con barras verticales y datos reales del servicio existente. El llenado se limita a 100%; el porcentaje y estado permiten identificar un exceso.
- Actividad y desglose por categorías mantienen acciones y datos existentes.
- Navegación de cuatro destinos y botón de voz ocupan espacios distintos. Se conservan las opciones adicionales y el cierre con Escape.
- Panel de captura ajustado a `dvh` y áreas seguras. Temas y pantallas vacías comprobados.
- Se utiliza el componente de iconos existente para mostrar SVG o emoji de categoría correctamente.
- Textos mal codificados reparados en Cuentas, Inicio, Actividad, Presupuestos, Configuración, Asistente, Libro diario y gastos compartidos; el comportamiento financiero no fue cambiado.

## Verificación

Revisión con Chromium y datos sintéticos interceptados: 320, 390, 768 y 1440 px, en claro y oscuro; estado vacío adicional. Se comprueban desbordamiento horizontal, separación micrófono/navegación, objetivos de al menos 44 px, actualización, menú Más y Escape, panel de captura y selector de periodo.

Las capturas documentan el aspecto con fixtures, no los saldos de una persona real. Esto no verifica la transcripción con un micrófono físico ni sustituye pruebas con el backend y datos reales.

Resultado: 149 pruebas frontend pasan en 18 archivos; build de producción correcto. Permanecen los avisos de tamaño de bundle inicial (aproximadamente 582 kB frente al umbral de aviso de 500 kB) y del CSS de Login (1 byte sobre su umbral de aviso). El build anterior ya emitía ambos avisos y medía aproximadamente 567 kB.

También se comprobaron Actividad, Cuentas, Presupuestos y Configuración en claro y oscuro, con datos sintéticos y sin errores de JavaScript ni desbordamiento horizontal. Los 22 pares de colores centrales pasan AA. Resultados estructurados en `verification.json`, `browser-checks.json` y `secondary-screen-checks.json`; capturas propias en `screens/`.
