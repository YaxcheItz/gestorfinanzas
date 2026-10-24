# Medición inicial y operación — Etapa 13

## Entrega inicial

Rama independiente `mejoras/etapa-13-mediciones-operacion` desde develop remoto `fd821fb79e9ed86d7fc0e229733df6589441fe3c`. Añade mediciones reproducibles y artefactos CI por SHA. No añade proveedores, telemetría externa, dependencias, migraciones ni recursos contratados.

Desde `frontend`:

```text
npm run build
npm run metrics:test
npm run metrics:build --silent
npx playwright test rendimiento-local.spec.ts
```

El medidor del build lee únicamente los archivos públicos generados. Recorre imports/exports estáticos y modulepreloads una sola vez, diferencia los imports dinámicos del conjunto inicial, cuenta CSS e inline por separado y registra bytes, gzip/Brotli y SHA256. Referencias externas no se descargan y se cuentan como no medidas. Los scripts dinámicos creados durante la ejecución, fuentes, imágenes y latencia no forman parte de los bytes JavaScript/CSS. No ejecuta el JavaScript analizado ni lee datos de usuarios.

CI ejecuta cinco pruebas del medidor, publica `frontend-build-measurement-<SHA>` y conserva siete días el reporte. Se mantienen los presupuestos Angular existentes (aviso 500 kB y error 1 MB inicial); no se inventan límites nuevos a partir de una sola muestra.

## Primera referencia local

Build de la base fd821fb, equivalente funcional a privacidad 0.1.9 publicada. Node 24.10.0 local; CI usa Node22, registrado en cada reporte para interpretar diferencias de compresión. Gzip nivel9/Brotli calidad11 son estimaciones reproducibles de archivos, no transferencia medida de Vercel.

| Conjunto | Cantidad | Bytes originales | Gzip | Brotli |
| --- | ---: | ---: | ---: | ---: |
| JavaScript inicial | 23 | 385980 | 125784 | 111506 |
| CSS inicial externo | 1 | 96916 | 18353 | 15150 |
| Todo JavaScript generado, incluidos workers y archivos no iniciales | 63 | 1241291 | 363608 | 320821 |

Inline: 0 bytes JavaScript y 5571 bytes CSS, medidos aparte. Cero referencias externas en el conjunto estático analizado; esto no describe scripts cargados después por funcionalidades opcionales.

El ensayo HTTP local crea veinte compras sintéticas más el saldo inicial de una cuenta. Mide tres lecturas secuenciales a través del proxy de desarrollo, tres calentamientos y veinte muestras por operación. Percentiles por rango más próximo (`ceil(p × n)`), sin guardar cuerpos, identificadores, tokens ni credenciales en el reporte.

| Operación | p50 local H2, ms | p95 local H2, ms |
| --- | ---: | ---: |
| Health | 11.104 | 12.914 |
| Cuentas | 12.611 | 24.195 |
| Página de movimientos | 16.071 | 24.659 |

Son latencias HTTP calientes de una muestra pequeña H2 local, no p95 productivo, duración SQL ni ensayo de carga. El mismo recorrido en CI usa PostgreSQL local aislado y publica `api-local-latency-<SHA>` durante siete días. Los asserts verifican respuestas correctas; no falla CI por una promesa de velocidad arbitraria. Antes de escribir datos exige frontend local y, si se configura PostgreSQL, host local.

## Costes y límites: inventario verificado en código

- `AiProviderRouter` limita por proceso cuatro llamadas simultáneas, entrada hasta 60000 caracteres, salida solicitada hasta 1200 tokens y respuesta hasta 40000 caracteres. `AiHttpClient` limita conexión/lectura a 10/30 segundos. No son un presupuesto monetario global ni se multiplican sus garantías por usar más instancias.
- `FiltroLimiteAbuso` aplica ventanas por usuario, entre ellas veinte solicitudes por minuto para rutas costosas de asistente/notificaciones y seis para exportaciones. El almacenamiento se selecciona con `ABUSE_LIMIT_STORE`; el estado efectivo actual de esa variable en Render no se verificó en esta entrega. El almacén PostgreSQL falla con 503 ante indisponibilidad y evita un fallback a memoria que multiplicaría presupuestos.
- `LimiteIa` (diez por minuto) no tiene llamadores en código productivo: no contarlo como protección efectiva. No se conecta otro contador arbitrario sobre el filtro existente.
- No se consultaron facturas, se hicieron llamadas de IA ni se verificaron tarifas/cuotas actuales de proveedores. Coste real, presupuesto global distribuido y alertas siguen pendientes. No afirmar coste cero por este ensayo local.

## Pendientes para cerrar Etapa13

1. Arranque físico/frío, p95 de consultas e interpretación con volumen representativo, tasas de reglas y colas reales consentidas; diferenciar calentamiento y reposo del hosting.
2. Revisar planes SQL/paginación y los índices que una medición justifique; no cambiar lenguaje, base ni hosting por intuición.
3. Verificar configuración operativa real de límites, presupuesto global y consumo/token por proveedor sin registrar prompts o cuerpos bancarios. Establecer alertas/retención con datos agregados y costes sustentados.
4. Mantener respaldo cifrado y ensayos de recuperación aislados, comprobar despliegues/rollback y dependencias. El ensayo local financiero de #125 y los snapshots productivos DPAPI conservan alcances diferentes.
5. Instalar y verificar el bloqueo nativo cuando vuelva el Samsung; piloto bancario sigue esperando aviso habitual. Etapas10/12/13 no se cierran por estos reportes.

## Referencias técnicas

El análisis estático usa la [API oficial del compilador TypeScript](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API), con TypeScript5.9 ya instalado. La compresión usa [zlib de Node](https://nodejs.org/api/zlib.html). No se instaló una biblioteca adicional para medir.
