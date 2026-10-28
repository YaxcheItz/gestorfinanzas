# IA gratuita, consumo y presupuesto global — Etapa 13

Decisión del propietario,27oct2026: Kaptal utiliza únicamente IA gratuita. Confirmó que las cuentas de Groq y Gemini están en Free sin facturación activada. Es una confirmación del propietario, no una comprobación automática de sus paneles. No se contratan servicios ni se activan planes de pago. Esta política no depende de pedir confirmación por cada movimiento.

## Investigación y elección

Fuentes oficiales revisadas28octUTC. La velocidad anunciada del proveedor no es latencia medida en Kaptal ni comparación con idénticos prompts.

| Opción | Evidencia y decisión |
| --- | --- |
| Groq, `openai/gpt-oss-20b` | Modelo ya integrado; Groq publica aproximadamente1000tokens/s y acceso con límites Free. Preferencia predeterminada para texto; el nombre del modelo no implica usar la API de OpenAI. |
| Gemini, `gemini-3.5-flash-lite` | Modelo estable de baja latencia, con nivel gratuito de entrada/salida. Predeterminado del cliente Gemini, pensamiento mínimo y sin herramientas externas. |
| Gemini2.5Flash/Flash-Lite | Conservados para la configuración existente y un fallback fijo. Google limita2.5a proyectos que ya los usaban; no son la recomendación para cuentas nuevas. |
| Groq, `whisper-large-v3-turbo` | Audio con plan Free del propietario. Si no está disponible, escribir o usar la captura nativa existente; no recurrir a una API de pago. |
| Cerebras | Publica velocidades altas, pero su documentación vigente ofrece créditos de prueba que vencen, sin nivel gratuito permanente. Se excluye del requisito de gratuidad continuada. |

No se añadieron proveedores, claves, SDKs o dependencias. Los límites publicados no se copian como cuota garantizada de la cuenta. Groq y Gemini rechazan exceso de sus cuotas; no se intenta subir de plan ni pagar para continuar.

Fuentes: [modelos Groq](https://console.groq.com/docs/models), [límites Groq](https://console.groq.com/docs/rate-limits), [facturación Groq](https://console.groq.com/docs/billing-faqs), [precios Gemini](https://ai.google.dev/gemini-api/docs/pricing), [modelos Gemini](https://ai.google.dev/gemini-api/docs/models), [migración Flash-Lite](https://ai.google.dev/gemini-api/docs/generate-content/whats-new-gemini-3.6), [facturación Gemini](https://ai.google.dev/gemini-api/docs/billing), [límites y prueba Cerebras](https://inference-docs.cerebras.ai/support/rate-limits).

## Política aplicada antes de HTTP

`AiUsagePolicy` permite solo Groq/Gemini, modelos fijos revisados y sus endpoints oficiales HTTPS. Un modelo no listado, alias `latest`, proxy ajeno o proveedor no confirmado se rechaza antes de enviar. Las cuentas deben permanecer en Free: una clave no permite demostrar automáticamente su plan ni impedir que el propietario active facturación después.

`OpenAiProvider` conserva únicamente compatibilidad con la configuración anterior: está deshabilitado y carece de transporte HTTP. La transcripción tampoco construye ni usa un cliente de OpenAI. Aunque permanezca una clave antigua, no habilita un fallback de pago. No se borra ni muestra esa clave.

Groq queda como preferencia por defecto y Gemini como alternativa de configuración si no hay Groq disponible. Se respetan selecciones explícitas de proveedor gratuito. No se añade una cascada infinita de proveedores ante errores. Gemini conserva un máximo de dos intentos de modelo; cada intento reserva cuota por separado. Las categorías bancarias y reglas deterministas siguen sin IA externa.

## Presupuesto global

| Configuración | Efecto |
| --- | --- |
| `AI_FREE_TIER_PROVIDERS=groq,gemini` | Proveedores aprobados tras la confirmación del propietario. Vacío desactiva ambos. No certifica facturación por API. |
| `AI_GLOBAL_REQUEST_LIMIT_24H=-1` | Predeterminado: sin cuota numérica adicional inventada; solo proveedores Free y sus cuotas, además de los límites por usuario/concurrencia existentes. |
| `AI_GLOBAL_REQUEST_LIMIT_24H=0` | Bloquea llamadas externas antes de HTTP. Las reglas locales continúan disponibles. |
| Valor positivo | Tope conjunto de intentos externos para todos los usuarios, proveedores e instancias durante24horas desde la primera reserva de la ventana. Exige `ABUSE_LIMIT_STORE=postgres`. No es un reinicio a medianoche ni un presupuesto en dinero/tokens. |

El contador reutiliza PostgreSQL y la tabla de límites existente, sin migración. La clave global es compartida por texto, audio y fallbacks. Cada intento reserva antes de HTTP; no se devuelve la reserva por error, porque un fallo no demuestra ausencia de consumo. Con presupuesto positivo, arrancar sin almacén compartido falla; ante indisponibilidad/exceso se rechaza la llamada, sin cambiar a memoria local ni habilitar otro proveedor de pago.

La política de coste cero se sustenta en planes Free confirmados y retirada de rutas de pago. No se configura un número arbitrario de solicitudes ni se atribuyen costes monetarios a los contadores. Cambiar el estado de facturación exige revisar la política antes de seguir usando las claves.

## Consumo y señales operativas

`KAPTAL_AI_REQUEST provider=… outcome=reserved` cuenta intentos preparados de salida; incluye errores de red posteriores y fallbacks. No significa respuesta correcta, petición facturada ni movimiento guardado. `KAPTAL_AI_BUDGET outcome=…` avisa de proveedor/modelo/origen no permitido, bloqueo, cuota agotada o contador no disponible. Sin prompt, respuesta, identidad, modelo configurable, URL, credenciales, excepción ni contenido bancario en las líneas de métricas.

El resumidor existente acepta formato2 y añade `outboundAttempts` por proveedor y `budgetEvents` por motivo; mantiene generaciones lógicas, percentiles y lectura/memoria acotadas. Las señales son logs agregados, sin enviar mensajes/correos externos. Tokens reales y duración del audio no se deducen a partir de solicitudes ni caracteres: siguen pendientes como métrica distinta.

## Verificación y límites

Pruebas con proveedores HTTP simulados: planes/modelos/orígenes permitidos, cero llamadas con bloqueo, cuota compartida, rechazo ante fallo del contador, cada intento de Gemini, borrado de audio y ausencia de fallback a OpenAI aunque exista una clave antigua. Suite backend local previa al último caso de Flash-Lite:579casos sin fallos/errores y ocho PostgreSQL reservados para CI;26focales y11Python correctas. Último caso del contrato Flash-Lite y CI exacto se registran en continuación/evidencia privada.

Sin generaciones reales para QA, benchmarks pagados, escrituras financieras productivas ni otra APK por esta parte de backend. CI/PostgreSQL, integración, despliegue e instalación0.1.16se informan por separado. Etapa13 continúa abierta: tokens reales, cuotas efectivas por cuenta, p95 representativo, observación de uso habitual y operación/recuperación restante. No presentar la decisión Free como gratuidad ilimitada ni la velocidad publicada como rendimiento físico comprobado.

## Representación REST del nivel de razonamiento

Para GenerateContent se usa `generationConfig.thinkingConfig.thinkingLevel = "MINIMAL"`, valor canónico del enum [ThinkingLevel de la API REST](https://ai.google.dev/api/generate-content#ThinkingLevel). El formato de los ejemplos de otros SDKs/Interactions no sustituye el contrato REST. JSON comprobado con HTTP simulado; veinte casos focales Gemini/metadatos correctos, sin generación real de QA.

## Publicación conjunta verificada

#155 integrada a main `5bc2ae6e2a8fbeb04e174740ad9639a73593619b` tras quince checks correctos. CI464/Android99 posteriores y Render7387852850/VercelProduction7387867984 SUCCESS. Verificación pública 2026-10-28T14:24:17.198Z:66estáticos, API directa/proxy y Google correctos; V11–V14 de solo lectura, sin migraciones nuevas. APK0.1.16final preparada, no instalada porque el teléfono está desconectado. Evidencia física anterior y observación real pendiente se mantienen separadas. Cierre de documentación/aislamiento en `.local/ampliacion-cierre.json`.

El aislamiento final está documentado en `AISLAMIENTO_IA_EN_PRUEBAS.md`: la primera suite bancaria de la sesión heredó una clave Gemini y registró tres generaciones; no se verificó su coste. Las pruebas posteriores de estas partes utilizaron claves retiradas/HTTP simulado. El perfiltest ahora bloquea proveedores y credenciales heredadas, con595casos locales correctos (ocho PostgreSQL reservados para CI). No afirmar cero llamadas externas para toda la sesión.
