# Etapa 13: métricas operativas de generaciones de IA

Esta parte permite contar resultados y medir duración de generaciones sin registrar su contenido. No implementa todavía presupuesto global, tokens consumidos, precios ni alertas automáticas.

## Registro del backend

`AiProviderRouter.generate` emite una línea INFO por invocación, incluyendo las rechazadas:

```text
KAPTAL_AI_GENERATION provider=openai outcome=success elapsed_ms=10
```

El ejemplo es ficticio. Los únicos campos del mensaje son proveedor de una lista cerrada, resultado y milisegundos enteros no negativos. No incluye prompt, respuesta, excepción, modelo, URL, usuario, correo, cuenta, importe, credencial ni identificador de solicitud. Un nombre de proveedor desconocido se convierte en `unknown`.

| Resultado | Significado |
| --- | --- |
| `success` | El proveedor devolvió una respuesta que pasa las validaciones existentes del router. No acredita interpretación correcta ni movimiento guardado. |
| `provider_error` | La generación terminó con una excepción del proveedor/configuración. El mensaje y la traza no se añaden al registro de métricas. |
| `invalid_request` | La entrada supera los límites existentes o es inválida; no se llama al proveedor. |
| `busy` | No hay permiso de concurrencia disponible; no se llama al proveedor. |
| `invalid_response` | Respuesta nula o demasiado grande, según las validaciones existentes. |

La duración abarca el router y la implementación seleccionada, incluidas sus posibles alternativas internas. Una generación puede producir más de una petición HTTP: **el contador no representa llamadas facturadas**. Tampoco mide toda la petición HTTP de la app ni la ejecución posterior de acciones financieras.

Se preservan proveedor seleccionado, respuesta, excepciones, límites y liberación de permisos existentes. No cambia el contrato `AiProvider.generate`, añade dependencias, expone un endpoint ni modifica el esquema de base de datos.

## Resumen local

Guardar una exportación privada del backend en texto plano UTF-8 en `.local/backend-operacion.log` y ejecutar desde la raíz:

```powershell
python tools/operacion/resumir_ia.py .local/backend-operacion.log
```

También acepta entrada estándar con `python tools/operacion/resumir_ia.py`. Solo produce JSON agregado: registros aceptados, líneas ignoradas y grupos por proveedor/resultado. Los registros ajenos o malformados no se reproducen. Las líneas mayores de4096 caracteres se consumen y descartan completas.

Cada grupo conserva un máximo de1024 duraciones recientes. `count` corresponde a todos los registros válidos del grupo en esa exportación; media, mínimo, máximo y `p95WindowMs` corresponden únicamente a su ventana reciente. El p95 usa rango más cercano: posición `ceil(0.95 × n)` sobre la ventana ordenada. Para muestras pequeñas puede coincidir con el máximo; no es un percentil histórico de toda la aplicación.

Los grupos y la memoria están acotados. No mezclar exportaciones superpuestas al interpretar el recuento. Filtros de logging, rotación o registros omitidos impiden inferir consumo total a partir del resumen; cero registros no demuestra cero uso. No usar este informe como contabilidad, facturación o mecanismo de cuota.

El resumidor no sanea el archivo original. Mantener la exportación privada; compartir únicamente el JSON agregado si se necesita revisar estas métricas. No copiar logs reales al repositorio ni a pruebas.

## Validación y publicación

- Validación local:529casos backend sin fallos, ocho de PostgreSQL omitidos en H2 y reservados para CI; nueve pruebas Python correctas. Cobertura del router:100%líneas/90,91%ramas con JaCoCo; resumidor:95,16%líneas con trace de la biblioteca estándar. Ida/vuelta de33registros ficticios Java→Python, sin texto de origen en el informe.
- Pruebas del router con proveedores simulados: resultado intacto, formato cerrado, errores sin texto privado, entradas rechazadas, respuestas inválidas, identidad de los tres proveedores y saturación/liberación de permisos.
- Pruebas del resumidor: recuentos/p95, separación de resultados, ventana acotada, líneas largas, contenido desconocido, UTF-8 inválido y errores de lectura sin reproducir rutas privadas.
- Comprobar ida y vuelta con logs de pruebas sintéticas. No generar llamadas de IA de pago ni QA productiva para validar la instrumentación.
- Después de publicar: verificar CI del HEAD exacto, despliegues, HTTPS/configuración pública y esquema. La primera evidencia de métricas productivas llegará con el uso normal; no confundir despliegue correcto con una generación real ya observada.

Se mantiene Kaptal Android0.1.14/código15: este cambio de backend/herramientas no necesita otro APK. TalkBack permanece omitido; Gmail deshabilitado. El piloto de compras real y el resto de Etapa 13 siguen abiertos.

### Entrega comprobada

Fuente `d3408b6b4a4338931434134490f86e704cf8aaff`, #142 integrado a develop `52907b14ac69b8c773f0fe0478cdcf419c3881bf`. CI422/40444247094 y CI423/40444293930 SUCCESS. Promoción #143 después de CI424/40445071545 y CI425/40445094529 SUCCESS; main `0ab5674624f6d5acabe61b0b3e615b019a5e9276`, CI426/40445895585 posterior SUCCESS. Todos los checks del commit y Vercel se comprobaron antes de cada integración.

Render7349787963 y Vercel Production7349804463 SUCCESS para ese main. A las2026-10-27T03:50:19Z pasaron health directo/proxy HTTPS, configuración Google y coincidencia de los60archivos JS/CSS y manifiesto de la entrega0.1.14. A las03:50:25Z se comprobaron V11–V14 en transacción de solo lectura, sin nueva migración. Respaldo previo DPAPI actualizado y verificado, sin restauración. Detalles privados en `.local/metricas-ia-production-result.json`, `.local/metricas-ia-production-schema.json` y `.local/metricas-ia-integration.json`.

Esto acredita publicación y disponibilidad; no acredita una generación real ya observada. La primera métrica productiva se revisará durante uso habitual, sin llamadas de pago para probar. No hay instalación ni comprobación física nueva por esta parte.

## Referencias de implementación

Se reutiliza el [logging parametrizado de SLF4J](https://www.slf4j.org/manual.html) existente. Para duración se toma la diferencia entre lecturas de [System.nanoTime de Java 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/System.html#nanoTime()), sin usar la hora del calendario como cronómetro.

## Alertas operativas agregadas

El JSON formato3 incorpora el campo aditivo `operationalAlerts`. Cada entrada contiene `code`, `count` y, cuando corresponde, `provider`. Mantiene intactos generaciones, intentos, presupuesto y tokens. Las alertas se calculan sobre los registros aceptados de toda la entrada; los percentiles siguen usando su ventana acotada.

- `budget_blocked`, `budget_exhausted`, `budget_unavailable`, `budget_unverified`: senales emitidas por el control existente; no equivalen a cuota del proveedor ni factura.
- `provider_error`, `invalid_response`, `busy`: cantidad de generaciones con ese resultado por proveedor. No son conteos de intentos HTTP ni sumas de incidentes independientes.
- `usage_unavailable`: respuestas sin contadores de tokens, separadas de respuestas que reportan cero.

Una misma operacion puede producir varias senales: no sumar alertas como total de fallos. Una lista vacia significa ausencia de esas senales en la muestra, no salud global, actividad reciente o coste cero. No se envian mensajes, correos o telemetria, ni se crean cuotas o umbrales. La salida solo conserva codigos permitidos y conteos; los prefijos y textos ajenos no se reproducen.

Verificacion sin proveedores reales: `python -m unittest discover -s tools/operacion`.
