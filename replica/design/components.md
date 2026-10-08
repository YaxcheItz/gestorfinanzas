# Sistema visual de Kaptal

Implementación: `frontend/src/monai-theme.css`. Referencia: `../recon.md`. Valores de color y contraste: `tokens.json` y `tokens-dark.json`.

| Componente | Decisión | Comportamiento conservado |
| --- | --- | --- |
| Balance | Cifra centrada de 34–60 px, sin fondo de tarjeta. | Carga, privacidad de montos, moneda, cambio de mes y estado sin cuentas. |
| Ingresos/gastos | Superficie redondeada compacta, etiquetas y flechas. | Montos del periodo y diferenciación por tipo. |
| Presupuesto | Columna de 176 px, límite punteado, relleno pastel proporcional. | `progressbar`, valores accesibles, porcentaje, estado excedido y carrusel con botones. |
| Movimiento | Fila con superficie del tema, icono SVG/emoji y monto alineado. | Gestos, edición, eliminación y teclado existentes. |
| Navegación | Cuatro enlaces/botón en una cápsula flotante. | Router, destino activo, menú de opciones y Escape. |
| Captura | Micrófono de 60 px independiente; panel de ancho y alto limitados al viewport. | Toque para texto, mantener para voz, procesamiento y revisión de propuestas. |
| Selector de periodo | Botón de al menos 44 px y superficies coherentes con el tema. | Mes, semana, hoy y periodo personalizado. |
| Desktop | Dos columnas para presupuestos y actividad; balance ocupa todo el ancho. | Mismos destinos y controles que móvil. |

Manrope continúa como fuente local. Espaciado sobre base de 4 px. Fondos marfil/blanco en claro; carbón en oscuro. Acento terracota de Kaptal para voz y foco. Los colores de presupuestos proceden de las categorías del usuario y se mezclan con la superficie del tema.

Los contornos decorativos no representan por sí solos controles. El foco de teclado usa un contorno de 2 px y offset de 3 px. Se respeta `prefers-reduced-motion`, se reservan las áreas seguras y se comprueba que el panel de captura cabe en la pantalla.

El control de contraste de tokens comprueba combinaciones centrales de texto, fondos, acciones, estados y foco. No constituye una certificación WCAG de toda la aplicación ni valida colores personalizados arbitrarios.
