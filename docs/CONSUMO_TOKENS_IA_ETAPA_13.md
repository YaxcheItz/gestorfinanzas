# Consumo reportado de tokens — Etapa 13

Parte independiente `mejoras/etapa-13-consumo-tokens-ia`, desde develop remoto comprobado `d9e00cb4a5e6341b1c92b3553776eb11e906071f`, actualizado después con #153. Continúa la política gratuita y el presupuesto de solicitudes descritos en `IA_GRATUITA_PRESUPUESTO_ETAPA_13.md`. No añade proveedores, peticiones externas, SDKs, endpoints, campos financieros ni migraciones.

## Datos medidos

Se leen únicamente contadores de la respuesta HTTP ya recibida. No se llama a un tokenizer ni a otra API para medirlos.

| Proveedor | Entrada | Salida | Total |
| --- | --- | --- | --- |
| Groq chat | `usage.prompt_tokens` | `usage.completion_tokens` | `usage.total_tokens` |
| Gemini | `usageMetadata.promptTokenCount` | `usageMetadata.candidatesTokenCount` | `usageMetadata.totalTokenCount` |

Fuentes oficiales: [respuesta de Groq](https://console.groq.com/docs/api-reference), [UsageMetadata de Gemini](https://ai.google.dev/api/generate-content#UsageMetadata), [contadores de entrada, salida y razonamiento](https://ai.google.dev/gemini-api/docs/generate-content/tokens).

Gemini puede incluir razonamiento y herramientas dentro del total reportado, mientras la salida refleja candidatos. Se conserva el total del proveedor; no se sustituye por entrada+salida ni se vuelve a sumar la salida al total. El prompt puede incluir tokens de caché y no se cuentan de nuevo por separado.

Cada dato debe ser un entero JSON no negativo, convertible a long y hasta mil millones; el total no puede ser menor que entrada+salida. Este límite valida metadatos, no amplía los límites de generación. Valores textuales, decimales, negativos, enormes, inconsistentes o campos ausentes no se convierten en estimaciones. Solo ceros recibidos explícitamente se registran como ceros.

Una respuesta sin contadores completos válidos produce `status=unavailable` sin números. Una petición sin respuesta HTTP o rechazada puede consumir recursos sin aportar metadatos; no se interpreta su ausencia como consumo cero. No se calcula un importe monetario ni se afirma equivalencia con una factura.

## Logs y resumen agregado

`KAPTAL_AI_USAGE` incluye solo proveedor permitido, estado y los tres contadores. No incluye modelo, URL, petición, respuesta, identidad, ID de proveedor, prompt, excepción, tokens de autenticación ni texto bancario. Se registran los contadores antes de validar el texto final: una respuesta vacía o rechazada por la app puede haber consumido tokens.

El resumidor `tools/operacion/resumir_ia.py` usa formato3. Conserva los campos de generaciones lógicas, intentos HTTP y señales de presupuesto, y añade:

- `reportedTokenUsage`: respuestas con metadatos válidos y sumas de entrada/salida/total por proveedor.
- `unavailableTokenUsage`: respuestas sin metadatos completos válidos por proveedor.

Mantiene lectura por líneas acotada, drenaje de líneas largas, grupos permitidos y ventana de latencias limitada. No reproduce líneas originales. Rechaza contadores imposibles y sufijos privados también al resumir logs. Acepta registros históricos de generación sin inventarles consumo de tokens; no reconstruye datos que nunca se guardaron.

Generaciones, intentos y respuestas con tokens son magnitudes distintas. Un fallback puede producir dos intentos y una respuesta con contadores; un error puede dejar consumo desconocido. La suma del reporte abarca únicamente los contadores recibidos en sus logs de entrada, no garantiza cubrir todo el uso de la cuenta del proveedor.

## Comprobaciones

-40pruebas focales backend correctas, incluidas13nuevas de metadatos: HTTP simulado Groq/Gemini conserva texto de respuesta, contadores, rechazo de datos inválidos y ausencia de contenido privado en logs.
-593casos backend locales sin fallos/errores; ocho PostgreSQL omitidos en H2 y reservados para CI. Claves de proveedores retiradas del proceso de pruebas y base H2 aislada fijada explícitamente.
-14pruebas Python correctas, incluidas separación de desconocidos y ceros, totales sin doble suma, rechazo de valores imposibles/sufijos privados y salida CLI agregada.
-Sin nuevas llamadas de IA para QA ni escrituras financieras productivas. No requiere otra APK. El teléfono permanece desconectado y la instalación0.1.16final sigue pendiente.

CI exacto, integración y producción se registran en estado/plan y `.local/ia-tokens-delivery.json`. Pendientes: observación de metadatos durante uso habitual, cuotas efectivas por cuenta, duración de audio que el proveedor realmente reporte, p95 representativo y operación/recuperación restante. No cambiar planes Free ni habilitar fallback de pago para obtener esas comprobaciones.

## Publicación conjunta verificada

#155 integrada a main `5bc2ae6e2a8fbeb04e174740ad9639a73593619b` tras quince checks correctos. CI464/Android99 posteriores y Render7387852850/VercelProduction7387867984 SUCCESS. Verificación pública 2026-10-28T14:24:17.198Z:66estáticos, API directa/proxy y Google correctos; V11–V14 de solo lectura, sin migraciones nuevas. APK0.1.16final preparada, no instalada porque el teléfono está desconectado. Evidencia física anterior y observación real pendiente se mantienen separadas. Cierre de documentación/aislamiento en `.local/ampliacion-cierre.json`.

El aislamiento final está documentado en `AISLAMIENTO_IA_EN_PRUEBAS.md`: la primera suite bancaria de la sesión heredó una clave Gemini y registró tres generaciones; no se verificó su coste. Las pruebas posteriores de estas partes utilizaron claves retiradas/HTTP simulado. El perfiltest ahora bloquea proveedores y credenciales heredadas, con595casos locales correctos (ocho PostgreSQL reservados para CI). No afirmar cero llamadas externas para toda la sesión.
