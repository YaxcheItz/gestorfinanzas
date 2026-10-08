# Revisión de producto y tecnología de Kaptal

## Dirección de diseño

Kaptal debe sentirse como una herramienta tranquila para revisar el dinero, no como una hoja de cálculo ni como un chat de IA. Tomé como referencia patrones que hoy usan Monarch, YNAB y Copilot:

- Un inicio que prioriza el saldo disponible, el flujo del mes y los próximos movimientos.
- Registrar un movimiento desde cualquier pantalla con pocos pasos y acceso directo a gasto e ingreso.
- Búsqueda y revisión de transacciones con totales del conjunto filtrado.
- Presupuestos legibles con colores consistentes por categoría.
- Recurrencias y pagos próximos visibles como lista o calendario.

Fuentes de producto: [Monarch: seguimiento, transacciones y recordatorios](https://www.monarchmoney.com/features/recurring), [YNAB: añadir transacciones desde cualquier pestaña](https://www.ynab.com/whats-new/add-transactions-from-your-plan), [Copilot: mejoras recientes de transacciones y categorías](https://www.copilot.money/dispatch).

La dirección visual aplicada a Kaptal usa verde bosque, fondos cálidos y neutros, cifras tabulares, navegación superior en escritorio y navegación inferior en móvil. Se conserva una sola acción principal por contexto y las acciones destructivas siguen pidiendo confirmación.

## Revisión del stack

**Conservar Angular 21 + Java 21/Spring Boot + PostgreSQL.** El frontend ya es una PWA Angular y el backend concentra reglas sensibles de cuentas, crédito, saldos y autorizaciones. Cambiar de lenguaje o framework no aceleraría la aplicación por sí solo; primero conviene medir consultas y mejorar la experiencia de registro.

La tabla de movimientos ya declara índices para `(usuario_id, fecha)` y `cuenta_id`, adecuados para las consultas principales del historial. Los cambios de índices adicionales deben partir de consultas lentas medidas en PostgreSQL, no de crear índices duplicados a ciegas.

## Registro rápido y asistente

El registro manual debe ser siempre la ruta más rápida y disponible sin IA. El asistente también resuelve frases directas como `registra un gasto de 250 en comida` sin llamar al proveedor cuando hay una sola cuenta activa; busca la categoría en el diccionario local y crea una propuesta que el usuario debe revisar y confirmar. Si hay varias cuentas o el comando no encaja con precisión, la petición sigue al asistente configurado, que debe preguntar si falta información.

Groq quedó disponible como proveedor alternativo mediante `AI_PROVIDER=groq` y `GROQ_API_KEY`, guardada solo en el backend. El modelo predeterminado configurado es `openai/gpt-oss-20b`; hay que verificar en la cuenta de Groq el acceso al modelo y los límites antes de activarlo. La clave y el contexto financiero no deben pasar al frontend.

Al enviar un mensaje con contexto financiero, la pantalla identifica al proveedor elegido y pide consentimiento. La API de Groq indica que normalmente no conserva datos de solicitudes de inferencia, aunque algunas funciones pueden necesitar retención; revisa la política y las opciones de tu cuenta antes de usar datos reales: [datos en GroqCloud](https://console.groq.com/docs/your-data).

## Fechas de tarjetas

CONDUSEF explica que la fecha de corte suele ser un día fijo mensual y que el pago límite generalmente llega 20 días naturales después. Kaptal calcula el vencimiento sumando esos 20 días a cada corte, por lo que la fecha cambia entre meses; se muestra como estimada y debe confirmarse en el estado de cuenta del banco. [CONDUSEF: corte y pago](https://www.condusef.gob.mx/index.php/instituciones-financieras?idc=905&idcat=1&p=contenido).

## PWA, Android y notificaciones

La rama ya contiene manifiesto, iconos, service worker, una cola local de movimientos y notificaciones push. Esto convierte el sitio en una aplicación instalable y mantiene movimientos pendientes en el dispositivo sin conexión. La sincronización usa identificadores de petición para reducir duplicados al reintentar.

Las notificaciones push requieren HTTPS, claves VAPID y permiso explícito. WhatsApp necesita credenciales de Twilio, una cuenta habilitada y consentimiento del usuario. La voz del navegador depende de soporte por plataforma; el formulario manual permanece como alternativa.

## Pagos y conexiones bancarias

Google Pay no notifica a una app cuándo alguien paga con su tarjeta ni permite leer libremente el historial de Wallet. Su API web sirve para que un **comercio** cobre: devuelve un token que el backend envía a un procesador de pagos. Google exige un procesador compatible y acceso de producción; no aplica a registrar automáticamente compras personales. [Google Pay Web](https://developers.google.com/pay/api/web/overview), [requisitos de Google Pay](https://support.google.com/console/answer/10914884?hl=en).

Para importar compras bancarias, la vía realista es Open Finance con consentimiento del usuario y un agregador que cubra sus instituciones. Belvo documenta conexiones a instituciones mexicanas, pero cobertura, contrato, precios y permisos deben confirmarse antes de diseñar esa integración: [API de instituciones de Belvo](https://developers.belvo.com/apis/belvoopenapispec/institutions).

## Google Assistant

Google anunció la transición de la experiencia móvil de Assistant a Gemini. Para Kaptal es más sostenible priorizar la PWA instalable, el registro por voz dentro de la app y enlaces directos al formulario que desarrollar una integración nueva atada al Assistant clásico. [Anuncio de Google](https://blog.google/products-and-platforms/products/gemini/google-assistant-gemini-mobile/).

## Cloudflare

La rama ya trae un Worker con Cloudflare Containers para arrancar el backend Java y reenviar solicitudes. No es un Worker Java nativo: necesita Workers Paid, acceso a PostgreSQL y validar cookies, CORS y conexiones. Además, Spring usa una tarea `@Scheduled` para recordatorios; un contenedor que duerme no garantiza ejecutarla a su hora. El archivo [DEPLOY.md](../DEPLOY.md) detalla lo que falta antes de mover tráfico de producción.
