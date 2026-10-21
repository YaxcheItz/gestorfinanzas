# Asistente financiero con evidencias

## Etapa 7 integrada y desplegada (2026-10-20)

Las consultas por lista usan listas activas accesibles al usuario, validan autorización antes de agregar y preservan `listaId`/`autorId` en la evidencia y en la navegación al historial/CSV. El parser pide aclaración ante una lista desconocida o ambigua y excluye listas archivadas. La evidencia de presupuesto conserva el mismo periodo, categoría, moneda, lista y autor que el cálculo; no atribuye movimientos que no coinciden. Los filtros de lista no compatibles se rechazan explícitamente. Chat y WhatsApp comparten este alcance.

Presupuestos presentan gastado, límite, disponible y moneda. Las consultas de recurrencias distinguen gastos, ingresos y plantillas generales; muestran tipo, cuenta, categoría, importe/moneda, frecuencia y próxima fecha, y aclaran que una plantilla no es un movimiento ejecutado. Se mantienen filtros de cuenta/categoría/fechas y “Sin categoría”.

PR #97 está integrado: `develop` en `a8ae7f33695a9cd84d6a3d4bddea339eaa459e18` y `main` en `f4b814e27de8a87a244d5cc5253e31a6fb1391bc`, con CI verde. Vercel Production y Render reportaron éxito; la web pública dio HTTP 200 y `/api/health` devolvió `UP`. Esto no sustituye una prueba autenticada completa de cada flujo en producción. El propietario confirmó los flujos en el preview.

Validación local final reportada: backend 480 pruebas correctas y 6 omitidas; frontend 343; build de producción correcto. No se consultaron ni alteraron datos financieros reales. Próximo: recorrido autenticado manual en producción y luego auditoría funcional/visual de Etapa 8. Gmail permanece deshabilitado y Etapa 6 omitida.

La consulta de presupuestos muestra ahora por categoría el monto gastado, el límite y el disponible con su moneda. Usa el monto disponible calculado por `PresupuestoService` y conserva su precisión/signo, incluido saldo negativo por exceso. La prueba de `AiActionService` verifica su inclusión junto con la evidencia de movimientos de alcance coincidente. Commit `0b495ee`; CI completo del SHA publicado en verde y suite backend local completa (480 pruebas, 6 omitidas en el árbol actual).

Las consultas recurrentes entienden «gasto(s) fijo(s)», gastos/ingresos recurrentes y solicitudes genéricas de plantillas. Las solicitudes de gastos o ingresos limitan el resultado al tipo pedido; la consulta genérica incluye ambos tipos identificados. Cada fila muestra cuenta, categoría (o «Sin categoría»), importe, moneda, frecuencia y próxima fecha. La respuesta distingue plantillas futuras de movimientos ya ejecutados. La palabra «recurrente» en una captura con importe no la transforma en consulta. Suite backend completa: 480 pruebas correctas, 6 omitidas; 31 pruebas dirigidas de parser/acciones; revisión de código sin hallazgos. Commit `c88f7f2` y todos sus checks remotos (backend, PostgreSQL, frontend, E2E, WhatsApp Cloudflare, canales personales y Vercel Preview) en verde. SHA documental `d8b290b` también tiene CI completo en verde.

## Alcance implementado

El trabajo está publicado mediante [PR #97](https://github.com/YaxcheItz/gestorfinanzas/pull/97), ya integrado en `develop` y desplegado en producción. Falta el smoke test autenticado del propietario en producción.

El propietario dejó WhatsApp como único canal externo y pidió omitir conciliación. Gmail está deshabilitado. El asistente reutiliza el chat de la aplicación, las consultas WhatsApp y los agregados financieros existentes; no crea otra contabilidad ni modifica saldos al consultar.

La implementación se encuentra en `develop`; la nueva auditoría empieza desde `origin/develop` actualizado en `auditoria/etapa-8-funcional-visual`. El borrador Gmail se conserva separado.

## Primera entrega: comparación mensual calculada

Comandos admitidos:

- «Compara este mes con el anterior».
- «Compárame este mes con el mes pasado en MXN».
- «Comparar el mes actual contra el mes anterior en USD».

El motor local reconoce únicamente las variantes soportadas. Una petición con categoría, lista u otro filtro no admitido no se transforma silenciosamente en una consulta global. Las consultas nuevas no requieren enviar datos a un proveedor IA.

La respuesta calcula ingresos y gastos de los movimientos del usuario autenticado. Muestra el inicio y fin de ambos periodos, los totales actuales y anteriores y su diferencia exacta mediante BigDecimal. No suma monedas distintas. Compara hasta el mismo día de cada mes y limita el periodo anterior al último día si el mes anterior es más corto; indica esa regla en la respuesta. Si no hay datos, lo expresa sin estimaciones. Excluye transferencias por la consulta agregada existente.

La misma ruta del motor se usa por el chat y las consultas WhatsApp. No hay un endpoint nuevo ni un cambio en el contrato público. No se crean propuestas, avisos ni movimientos al pedir esta comparación.

## Comprobaciones históricas de la primera entrega

Resultado del corte inicial del 20 de octubre: 76 pruebas relacionadas distintas correctas. Comando inicial: `mvnw.cmd -Dtest=MotorChatReglasTest,AiFinancialContextServiceTest,AiActionServiceTest,AiAssistantServiceTest,Whatsapp*Test test` (75 pruebas). Tras añadir la prueba HTTP de comparación se repitió `WhatsappConsultaIntegrationTest` (16 pruebas correctas, 15 ya incluidas y una nueva). En ese corte no se ejecutó la suite backend completa ni PostgreSQL; frontend sin cambios. La validación final y el estado de despliegue se resumen al inicio de este documento.

Pruebas unitarias del reconocimiento y los filtros no soportados; diferencias decimales exactas, meses cortos, cruce de año, ausencia de datos y rechazo de rangos inválidos. Pruebas de regresión del asistente y WhatsApp. Prueba HTTP/persistencia con datos sintéticos para verificar que solo se incluyen operaciones propias, las transferencias se excluyen y no cambian los saldos ni las cantidades de movimientos/propuestas/avisos.

Consultar el resultado final y el número de pruebas en `ESTADO_SESION.md`. Las pruebas de integración usan H2 y datos sintéticos; no son una prueba real del asistente desplegado.

## Continuidad

La Etapa 7 está cerrada. Para la siguiente etapa, seguir el alcance de Etapa 8 en `PLAN_MAESTRO_KAPTAL.md`, comenzar con pruebas observables y reproducibles y no afirmar como validado en producción algo cubierto solo por preview o health. No activar correo ni conciliación como dependencias.

## Segunda entrega: evidencia de la comparación y acceso al historial

Validación local: 54 pruebas backend relacionadas correctas (incluidas 17 HTTP/persistencia H2), 57 pruebas Angular correctas, build de producción y diff-check correctos. No se ejecutó aquí toda la suite ni PostgreSQL. Las pruebas de integración contrastan total/conteo de evidencia con historial y CSV, con otra moneda y otro propietario presentes, sin escribir nuevos movimientos al consultar. La interfaz verifica navegación, renderizado y omisión de la lista compartida activa exclusivamente para evidencia propia.

`AiChatResponse.evidence` es una lista aditiva de evidencias calculadas en servidor. Cada fila contiene `label`, `desde`, `hasta`, `moneda`, `tipo`, `operaciones` y `total`. La comparación genera ingresos/gastos de ambos periodos para cada moneda incluida. Las cantidades y los conteos provienen de consultas autorizadas; el proveedor IA no genera esta evidencia.

El asistente y la captura/reportes muestran botones con periodo, moneda y cantidad de operaciones. Al abrirlos se navega a `/transacciones?alcance=propio&fechaInicio=...&fechaFin=...&moneda=...&tipo=...`. El historial incluye únicamente los movimientos propios, sin heredar la lista compartida seleccionada ni filtros anteriores. Una selección explícita de lista o limpiar filtros sale de ese alcance. También se admite abrir otro periodo de evidencia estando ya en el historial.

Los endpoints existentes de historial y CSV aceptan el filtro opcional `moneda`, validado como tres letras mayúsculas. Conservan la misma autorización y filtran por moneda de la cuenta o moneda histórica si la cuenta ya no existe. Las peticiones normales siguen usando la lista activa; solo la navegación de evidencia omite ese contexto para coincidir con el agregado propio.

La evidencia refleja los datos al consultar. El historial vuelve a leer los registros actuales, por lo que una edición posterior puede cambiar el resultado. No es un estado de cuenta inmutable. La gráfica semanal genérica del panel rápido no se muestra junto a una respuesta con evidencia de otro periodo.

Referencias técnicas: [Router.navigate](https://angular.dev/api/router/Router) y [Spring Data Specifications](https://docs.spring.io/spring-data/jpa/reference/jpa/specifications.html).
