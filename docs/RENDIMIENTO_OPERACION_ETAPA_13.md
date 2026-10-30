# Medición inicial y operación — Etapa 13

## Cierre de medicion HTTP aislada del panel

- PR #179 integrado en develop `119f062d2dfe908799d6558f3215ee45eb36e250` desde `fddb8e5765ff20c4fafe8727fd55605024da9694`, tras CI 40982516661 y Android 40982516535 correctos. CI posterior 40983537127 y Android 40983536980 pendientes al registrar. CI posterior de `73fe852`: 40981893410 y 40981893489 correctos.
- La prueba de API con 20 gastos ficticios paso en PostgreSQL local aislado en CI: resumen p50/p95 12,864/13,702 ms y analitica 10,197/11,526 ms, 20 lecturas calientes cada uno. Artefacto correspondiente al merge temporal `81ca2dcd8d89a77f7f6751e7414e050c651c43bc` conservado en `.local/panel-api-ci`; fuente del PR distinta del merge temporal. Referencia H2 local en `.local/panel-api-local-h2.json`. No comparar como si fueran entornos identicos, ni inferir p95 productivo, carga representativa, Android o arranque frio.
- Solo cambia pruebas y documentacion: web sigue en main `a772aa3`; APK 0.1.19 preparada, sin instalar porque telefono desconectado. Esperar aviso habitual sin compras de prueba; seguir rendimiento y Etapa 13 antes de diseno y seguridad. Sin IA real ni QA financiera productiva.


## Medicion HTTP aislada del panel (30 octubre)

Se amplio `frontend/e2e/rendimiento-local.spec.ts` para medir resumen y analitica del panel sobre backend de pruebas, con 20 movimientos ficticios y dos cuentas (incluida la predeterminada). Antes de medir, comprueba que ambos agregados reflejen el gasto ficticio esperado. Con H2 local y proxy de desarrollo: tres calentamientos y 20 lecturas secuenciales por endpoint; resumen p50 18,542 ms/p95 22,816 ms, analitica p50 18,468 ms/p95 21,912 ms. La primera expectativa de una sola cuenta fallo porque el registro crea una cuenta de efectivo; se corrigio a dos y la prueba paso. Evidencia privada `.local/panel-api-local-h2.json`.

Son muestras calientes pequenas, no p95 de produccion ni volumen representativo; no miden SQL por separado, red real, Android o arranque frio. CI ejecutara la misma prueba con PostgreSQL local aislado; no se realizaron llamadas de IA ni QA financiera productiva.


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

## Datos y navegacion: primera carga sin lista guardada

Comando tras compilar frontend: `node scripts/measure-navigation.cjs`. Genera `frontend/test-results/navigation-synthetic.json`, tambien conservado por CI siete dias bajo el SHA. Tres contextos nuevos por caso: sesion vigente, renovacion artificial de2000ms, API artificial250ms con/sin lista guardada. Datos vacios ficticios; no consulta servicios externos, usuarios o IA reales. No mide SQL ni comportamiento de Android.

Se espera una respuesta de listas antes de pedir el primer panel cuando no existe contexto guardado. Conserva el inicio con cache y continua cuando listas termina vacia o falla. Recargas y cambios posteriores conservan su comportamiento. La espera inicial depende de que listas termine su respuesta o error; no se anade un timeout nuevo.

| Caso de control repetido | Peticiones iniciales antes/despues | Mediana local datos antes/despues, ms |
| --- | --- | --- |
| Sesion vigente, lista guardada | 11 / 11 | 618 / 626 |
| Renovacion artificial2000ms, lista guardada | 12 / 12 | 2678 / 2671 |
| API artificial250ms, sin lista guardada | 15 / 11 | 1191 / 1252 |
| API artificial250ms, lista guardada | 11 / 11 | 858 / 759 |

Estos datos acreditan la reduccion de cuatro solicitudes, no una mejora de velocidad. Tandas previas tuvieron otros tiempos; equipo, compilacion y recursos influyen. Tres muestras por caso no sustentan p95, ensayos de carga ni representatividad financiera. El medidor verifica estructura, fin de carga, navegacion, ausencia de errores JS/escrituras y conteos; no falla CI por umbrales de latencia.

No se modifica la APK0.1.18 ya instalada ni el backend. Para aplicar el cambio a Android se necesita otra entrega. La primera renovacion y el tiempo del backend siguen pendientes de observacion representativa.

## Medicion sintetica con datos no vacios

El medidor incluye un caso adicional sin lista guardada, con 50 movimientos, ocho categorias y dos cuentas ficticias. En tres contextos Chromium verifica que se vea un movimiento en Inicio y el primero y ultimo en Movimientos; red externa bloqueada y sin escrituras. Con demora artificial de 250 ms por API, la estructura tomo 134/139/135 ms, datos del panel 992/990/996 ms y datos de navegacion 387/422/385 ms. Cada endpoint del panel se consulto una vez. Evidencia local `.local/navigation-populated.json`.

El volumen es ilustrativo, no se ha contrastado con una distribucion real; no mide SQL, red real, Android ni Render, no permite calcular p95 representativo ni demuestra mejora de latencia. No se usan avisos ni datos financieros reales.
