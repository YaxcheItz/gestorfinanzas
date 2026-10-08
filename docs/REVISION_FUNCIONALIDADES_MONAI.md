# Revisión del alcance de funcionalidades e interacciones

Fecha: 4 de octubre de 2026. Proyecto: Kaptal (Angular + Spring).

**Auditoría inicial, conservada como referencia.** El usuario autorizó posteriormente modificar el alcance e implementar mejoras. Los resultados actuales, decisiones y pruebas están en [AJUSTES_ALCANCE_INTERACCIONES.md](AJUSTES_ALCANCE_INTERACCIONES.md). Las tablas y cifras de este documento describen el estado anterior a esas correcciones.

## Resultado y límites

Kaptal contiene buena parte de los controles del alcance facilitado por el usuario, pero no lo cumple completo. Hay controles cuya presentación promete un comportamiento que todavía no está conectado: los periodos Hoy/Semana y la fase Categorizando son los ejemplos principales. El donut necesita corregir su cálculo del total.

Esta revisión compara el código actual con el texto recibido; no certifica el comportamiento de la aplicación comercial MonAi. Se inspeccionaron plantillas, eventos, servicios y los filtros del backend. No se ejecutaron operaciones con datos reales, micrófono físico, bot de WhatsApp ni galería del teléfono. Las pruebas históricas de ESTADO_SESION.md no se presentan como una validación nueva. No se modificó código de aplicación en esta revisión.

Estados: **Sí** = hay implementación conectada en código; **Parcial** = existe con limitaciones o diferencias; **No** = no se encontró la interacción solicitada. Un Sí no sustituye una prueba en dispositivo real.

La matriz desglosa 45 comprobaciones: 31 Sí, 13 Parcial y 1 No. Con igual peso para cada fila y medio crédito para Parcial, la herramienta replica-diff calcula 83,3 % de cobertura del alcance por inspección de código. Es una medida orientativa, no un porcentaje de calidad ni una certificación de producción. Los fallos del total financiero y de los filtros tienen más impacto práctico que una diferencia de ubicación de los toasts. Matriz: `replica/alcance-interacciones/features.csv`; cálculo: `replica/alcance-interacciones/parity.json`. La columna `original=yes` representa un requisito del texto del usuario, no una verificación externa de MonAi.

## 1. Dashboard

| Interacción solicitada | Estado | Comportamiento actual |
|---|---|---|
| Dropdown/modal con Mes Actual, Semana, Hoy, Personalizado | Parcial | Las opciones existen. `seleccionarRango` cambia el estado y la etiqueta; las consultas siguen recibiendo mes/año. Hoy y Semana no filtran sus datos. Mes Actual tampoco restablece por sí solo el mes actual después de navegar a otro mes. |
| Intervalo personalizado | Parcial | Personalizado permite navegar por mes/año; no elegir fechas inicial/final arbitrarias. |
| Swipe del balance entre meses | Sí | Gestos táctiles cambian el periodo y recargan el dashboard. Se impide avanzar más allá del mes actual. |
| Donut con 3–4 categorías principales | Sí | Se ordenan por gasto y se muestran las cuatro principales de la moneda seleccionada. |
| Tocar segmento y mostrar monto y porcentaje del total | Parcial | La selección muestra nombre, monto y porcentaje, pero el denominador suma solo las cuatro categorías visibles. Con más categorías, el porcentaje y el centro «Total Gastos» excluyen el resto. |
| Últimas 5–10 operaciones y Ver Todo al final | Sí | Se limita a ocho movimientos y hay acceso al historial al final. |

Evidencia: `frontend/src/app/features/dashboard/dashboard.component.ts`, selector líneas 90–138, gestos 869–907, cálculos 913–954, consultas 1100–1133 y cambio de mes 1178 en adelante.

## 2. Captura híbrida

| Interacción solicitada | Estado | Comportamiento actual |
|---|---|---|
| FAB central, mantener pulsado para grabar y soltar para procesar | Sí | Pointer events, umbral de 280 ms, MediaRecorder y envío para transcripción. Requiere consentimiento, permiso de micrófono y contexto seguro. |
| Ecualizador en tiempo real | Parcial | Hay barras animadas mientras se graba; no se encontró análisis de amplitud del audio. La animación no representa el sonido real. |
| Toque simple abre entrada manual numérica | Parcial | Abre un textarea de captura en lenguaje natural. El formulario numérico existe en Transacciones, pero el toque del FAB no lo abre. |
| Panel inferior «Transcribiendo…» | Sí | Estado conectado al envío de audio. |
| Panel «Categorizando…» después de transcribir | No | El tipo y el texto están declarados, pero nunca se establece ese estado. La transcripción queda en el textarea para revisar y enviar; no se categoriza automáticamente al soltar. |
| Cancelar petición en cualquier fase de procesamiento | Parcial | Se cancela la suscripción HTTP de transcripción. La petición de captura/categorización no tiene cancelación equivalente. Cancelar en el cliente tampoco prueba que un proveedor remoto detenga trabajo ya iniciado. |
| Campo Qué / descripción | Sí | Existe descripción en el formulario manual y texto editable en la captura. |
| Campo Cuánto con numpad personalizado | Parcial | Hay input numérico con `inputmode="decimal"`; no hay teclado numérico construido por la app. |
| Calendario nativo | Parcial | Existe FechaPickerComponent con calendario propio, navegación de teclado y elección de fecha; no es un DatePicker nativo del sistema. |
| Control segmentado verde/rojo Ingreso/Gasto | Sí | El formulario manual tiene botones segmentados y añade Transferencia. |
| Toasts efímeros de éxito y error desde arriba | Parcial | Hay servicio, contenedor y avisos de éxito/error. En móvil se colocan abajo, por encima de la navegación, no bajan desde arriba como pide el texto. |

Evidencia: `frontend/src/app/shared/components/quick-capture/quick-capture.component.ts`, panel 23–43, envío 265–293, cancelación 236–243, FAB 446–477, grabación/transcripción 480–566; formulario en `features/transacciones/transacciones.component.ts` 530–710; `shared/components/fecha-picker/fecha-picker.component.ts`; `shared/components/toast-container/toast-container.component.ts` y `frontend/src/monai-theme.css:179`.

## 3. Historial

| Interacción solicitada | Estado | Comportamiento actual |
|---|---|---|
| Buscar texto libre con debounce de 300 ms | Sí | Timer de 300 ms, reinicio de página y consulta del historial filtrado. |
| Bottom sheet de filtros | Sí | Borrador independiente, aplicar/restablecer y cierre del panel. |
| Filtrar solo gastos/ingresos | Sí | Filtro por tipo. |
| Rango de monto mínimo/máximo | Sí | Validación de valores y orden; parámetros enviados y utilizados por la especificación del backend. |
| Categorías con selección múltiple | Sí | Lista de IDs enviada al backend y aplicada a la consulta. |
| Swipe izquierda revela papelera roja y confirmación | Sí | Se revela la acción y la papelera solicita «¿Eliminar permanentemente?». Se conserva un paso explícito antes de borrar. |
| Swipe derecha revela edición | Sí | Se revela el botón de edición; tocarlo abre el formulario. No abre la edición automáticamente al terminar el gesto. |
| Toque abre detalle a pantalla completa | Sí | Tarjeta con evento de detalle y alternativas Enter/Espacio; vista de detalle. |
| Metadatos: hora, Voz/Texto/WhatsApp y nota | Parcial | Hora de creación y nota disponibles. El método de captura se deduce buscando palabras en descripción/notas, no leyendo un dato de origen fiable. Puede etiquetar mal una compra descrita como «curso de WhatsApp» o perder el origen al editar la nota. |

Evidencia: `frontend/src/app/features/transacciones/transacciones.component.ts`, filtros 159–295, detalle 813–865, metadatos 1195–1217, debounce 1318–1326, borrado 1665–1672; `shared/components/movimiento-mobile-card/movimiento-mobile-card.component.ts`, gestos y acciones 24–177, heurística 430–434. Backend: `TransaccionController.java`, `TransaccionFiltroRequest.java`, `repository/specification/TransaccionSpecification.java` 52–74.

## 4. AI Reports

| Interacción solicitada | Estado | Comportamiento actual |
|---|---|---|
| Entrada de chat abajo | Sí | Formulario al final de la interfaz del asistente; debe verificarse su posición y visibilidad con el teclado móvil abierto. |
| Prompt pills con scroll horizontal y envío automático | Sí | Grupo horizontal; `usarSugerencia` establece el texto y llama a `enviarMensaje`. |
| Limpiar historial local sin borrar transacciones | Sí | Vacía señales de mensajes/entrada/error; no llama al borrado financiero. |
| Widgets en respuestas con Exportar Gráfico | Sí | Widgets de reporte y botón asociado al mensaje. |
| Guardar gráfico como imagen en galería | Parcial | Convierte SVG a PNG y usa compartir archivos si el navegador lo permite; en caso contrario descarga. No hay guardado directo y garantizado en la galería del sistema. |

Evidencia: `frontend/src/app/features/asistente/asistente.component.ts`, widget 85–89, prompts/formulario 218–240, sugerencias 268–271, limpiar 274–279, exportación 312–337.

Hay además un modo REPORT en el panel de captura rápida. No ofrece el mismo flujo completo de exportación que la pantalla del asistente y calcula un resumen semanal aparte. Conviene compartir componentes y datos entre ambas superficies para evitar diferencias.

## 5. Categorías

| Interacción solicitada | Estado | Comportamiento actual |
|---|---|---|
| Nueva Categoría abre formulario | Sí | Crear, editar, archivar y restaurar. |
| Nombre máximo 20 caracteres | Sí | Para categorías nuevas y cambios de nombre; se permite conservar un nombre antiguo más largo, una compatibilidad razonable. |
| Cuadrícula de emojis nativos | Sí | Selección de emojis renderizados por el dispositivo y entrada personalizada; también hay iconos propios. |
| Paleta de 12–16 colores planos | Sí | Dieciséis colores predefinidos. |
| Toggle presupuesto y límite mensual | Sí | Guarda presupuesto de gasto en el backend para el mes/año actual. No implica automáticamente repetir el límite en meses siguientes. |
| Mantener pulsado handle y arrastrar en móvil | Parcial | Handle con HTML Drag and Drop y botones para subir/bajar. No hay implementación específica de pulsación larga y arrastre táctil; debe validarse por dispositivo. |
| Orden aplicado a selectores manuales | Sí | CategoriaOrdenService ordena también el selector compartido. Se almacena localmente por usuario; no se sincroniza entre dispositivos. |

Evidencia: `frontend/src/app/features/categorias/categorias.component.ts`, formulario 104–166, paleta 199–204, validación 316–325, presupuesto 352–358, reordenar 440–469; `core/services/categoria-orden.service.ts`; `shared/components/categoria-selector/categoria-selector.component.ts:168`.

## 6. Configuración y perfil

| Interacción solicitada | Estado | Comportamiento actual |
|---|---|---|
| Avatar y email | Sí | Avatar con iniciales y datos de perfil; no hay evidencia aquí de subida de fotografía. |
| Cerrar sesión en rojo | Sí | Botón conectado a AuthService. |
| Obtener PIN mediante endpoint | Sí | Endpoint propio de Spring `/whatsapp/pin`. No usa Appwrite; cubre la finalidad sin requerir migración de backend. Depende de que el bot esté configurado. |
| Deep link al bot de WhatsApp | Sí | `wa.me` con texto VINCULAR y PIN. |
| Exportar todas las transacciones a CSV y compartir | Sí | Archivo CSV y Web Share de archivos cuando se admite; descarga como alternativa del navegador. |
| Borrar todos los datos escribiendo ELIMINAR | Parcial | Requiere ELIMINAR y autenticación adicional, pero la acción disponible borra también la cuenta. Falta la operación de vaciar datos conservando el acceso. |
| Claro, Oscuro y Automático en botones grandes | Sí | Tres opciones; Automático consulta y escucha los cambios de preferencia del sistema. |

Evidencia: `frontend/src/app/features/configuracion/configuracion.component.ts`, apariencia 62–86, perfil 132–152, PIN 194–211, logout 276–277, peligro 439–497, link 736–743, CSV 876 en adelante; `core/services/perfil.service.ts` 34–35 y 97–112; `backend/src/main/java/com/gestionfinanzas/controller/NotificacionController.java:55`.

## Cambios recomendados, en orden

1. **Corregir datos del dashboard.** Aplicar fechas reales a Hoy/Semana/Personalizado, volver al mes actual al elegir esa opción, y mantener consistente el periodo entre balance, gráficos y lista. Para el donut, usar el total de todas las categorías de esa moneda, añadiendo un segmento «Otros» cuando queden categorías fuera. Al cambiar de periodo/moneda, limpiar la categoría seleccionada y evitar datos antiguos si falla una consulta.
2. **Distinguir vaciar datos de eliminar cuenta.** Crear acciones separadas y explicar qué conserva cada una; mantener la confirmación ELIMINAR y autenticación. No reutilizar el borrado de cuenta como si fuera un simple reinicio financiero.
3. **Conectar la captura completa.** Decidir y etiquetar los accesos: toque para formulario manual, mantener para voz. Implementar Categorizando y cancelación de su petición; impedir guardados por accidente al cancelar un gesto. Conservar la revisión y confirmación de propuestas antes de guardar, porque la IA puede interpretar mal monto, moneda o categoría.
4. **Persistir el origen de captura.** Añadir un campo VOZ/TEXTO/WHATSAPP desde el servidor y mostrarlo sin depender de las notas. Distinguir fecha financiera de fecha/hora de registro en el detalle.
5. **Completar y probar móvil.** Arrastre táctil de categorías con alternativas subir/bajar, ciclo de permisos y liberación del micrófono, teclado abierto en chat y formularios, exportación/compartir en Android/iOS y fallback de navegador. La animación de voz debe usar niveles reales si se la denomina ecualizador.

## Ajustes que haría al alcance

- Sustituir «Appwrite» por «backend autenticado»: Kaptal ya tiene Spring y no necesita una migración para obtener PIN.
- Aceptar teclado decimal del dispositivo antes de construir un numpad propio; solo añadirlo si resuelve una necesidad concreta de captura.
- Especificar «Compartir o descargar PNG» para la versión web. Reservar «Guardar en galería» para una integración nativa comprobada.
- Mantener botones de edición/borrado/reordenación como alternativas a los gestos. Kaptal ya incorpora algunas de estas alternativas.
- Definir si Semana significa semana natural o últimos siete días, qué zona horaria rige los filtros y si el presupuesto se repite cada mes. El código actual etiqueta Semana como últimos siete días.
- Mantener multimoneda, transferencias, cuentas, importación CSV, respaldo/restauración, categorías archivadas y privacidad de montos. Aportan valor y no requieren retirarse para cumplir este alcance.

## Criterios para dar por cerrado el alcance

Probar rangos con operaciones fuera del mes, un donut con cinco o más categorías, origen independiente de las notas, cancelación antes/después de transcribir, fallo de red y permisos de micrófono. Verificar que limpiar chat conserva operaciones y que vaciar datos conserva el usuario. Completar exportación y gestos en un teléfono real. Estas verificaciones están pendientes; esta auditoría no las da por realizadas.
