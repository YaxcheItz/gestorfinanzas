# Asistente financiero con evidencias

## Avance local del 21 de octubre de 2026

Se añadieron filtros de consulta por lista activa y accesible al usuario, preservados por la evidencia y por la navegación del historial/CSV mediante `listaId` y `autorId`. El parser pide aclaración para una lista desconocida o ambigua y omite listas archivadas. Los agregados de listas se autorizan antes de consultar y cuentan únicamente movimientos del usuario propietario.

La evidencia presupuestaria ahora usa el mismo mes, categoría, moneda, lista y autor que el cálculo de `montoGastado`. Si no hay movimientos en ese alcance, no se presenta evidencia como si coincidiera. Los filtros de lista para saldo y plantillas recurrentes se rechazan claramente. WhatsApp recibe las listas autorizadas y devuelve la misma evidencia que el chat. Se mantienen los filtros de cuenta/categoría/fechas inclusivas y “Sin categoría”.

El cambio funcional se publicó en `c93e00a` y PR #97 permanece como borrador. Todos los checks del SHA completo `c93e00a6e083c35089ff5a85f3676f292b1c81f4` concluyeron en success: backend, PostgreSQL, frontend, E2E Chromium/API, WhatsApp Cloudflare, canales personales y Vercel Preview. El preview no es un despliegue de producción ni un merge. El SHA remoto previo `c51a7b1` fallaba en revisión de dependencias frontend; la alineación Angular `21.2.25`/overrides pasa ahora el CI. Producción sin vulnerabilidades conocidas; cinco alertas conocidas únicamente en dependencias de desarrollo.

Validación local completa: `mvnw -B verify` con 478 pruebas correctas y 6 omitidas; 72 pruebas dirigidas para motor, contexto, acciones, presupuestos, listas y WhatsApp; 343 pruebas frontend y build de producción correctos. Repetir `git diff --check` tras la última actualización documental. No se consultaron ni alteraron datos financieros reales.

El propietario revisó en la página del preview del PR #97 el flujo de consulta y evidencia y confirmó que funcionó. La validación es manual y corresponde al preview; no se afirma despliegue en producción. Los cambios posteriores que muestran disponible del presupuesto y detalles de recurrencias aún requieren revisión manual.

La consulta de presupuestos muestra ahora por categoría el monto gastado, el límite y el disponible con su moneda. Usa el monto disponible calculado por `PresupuestoService` y conserva su precisión/signo, incluido saldo negativo por exceso. La prueba de `AiActionService` verifica su inclusión junto con la evidencia de movimientos de alcance coincidente. Commit `0b495ee`; CI completo del SHA publicado en verde y suite backend local completa (480 pruebas, 6 omitidas en el árbol actual).

Las consultas recurrentes entienden «gasto(s) fijo(s)», gastos/ingresos recurrentes y solicitudes genéricas de plantillas. Las solicitudes de gastos o ingresos limitan el resultado al tipo pedido; la consulta genérica incluye ambos tipos identificados. Cada fila muestra cuenta, categoría (o «Sin categoría»), importe, moneda, frecuencia y próxima fecha. La respuesta distingue plantillas futuras de movimientos ya ejecutados. La palabra «recurrente» en una captura con importe no la transforma en consulta. Suite backend completa: 480 pruebas correctas, 6 omitidas; 31 pruebas dirigidas de parser/acciones; revisión de código sin hallazgos. Commit `c88f7f2` y todos sus checks remotos (backend, PostgreSQL, frontend, E2E, WhatsApp Cloudflare, canales personales y Vercel Preview) en verde. SHA documental `d8b290b` también tiene CI completo en verde.

## Alcance vigente

Publicado en GitHub para revisión mediante [PR #97](https://github.com/YaxcheItz/gestorfinanzas/pull/97), hacia `develop`. Publicar la rama no despliega el cambio ni sustituye comprobar CI.

El propietario dejó WhatsApp como único canal externo y pidió omitir conciliación. Gmail está deshabilitado. El asistente reutiliza el chat de la aplicación, las consultas WhatsApp y los agregados financieros existentes; no crea otra contabilidad ni modifica saldos al consultar.

Rama: `mejoras/asistente-evidencias`, worktree `.local/asistente-worktree`, desde `origin/develop` comprobado `211b457`. El borrador Gmail se conserva separado en el checkout principal.

## Primera entrega: comparación mensual calculada

Comandos admitidos:

- «Compara este mes con el anterior».
- «Compárame este mes con el mes pasado en MXN».
- «Comparar el mes actual contra el mes anterior en USD».

El motor local reconoce únicamente las variantes soportadas. Una petición con categoría, lista u otro filtro no admitido no se transforma silenciosamente en una consulta global. Las consultas nuevas no requieren enviar datos a un proveedor IA.

La respuesta calcula ingresos y gastos de los movimientos del usuario autenticado. Muestra el inicio y fin de ambos periodos, los totales actuales y anteriores y su diferencia exacta mediante BigDecimal. No suma monedas distintas. Compara hasta el mismo día de cada mes y limita el periodo anterior al último día si el mes anterior es más corto; indica esa regla en la respuesta. Si no hay datos, lo expresa sin estimaciones. Excluye transferencias por la consulta agregada existente.

La misma ruta del motor se usa por el chat y las consultas WhatsApp. No hay un endpoint nuevo ni un cambio en el contrato público. No se crean propuestas, avisos ni movimientos al pedir esta comparación.

## Comprobaciones

Resultado del 20 de octubre: 76 pruebas relacionadas distintas correctas. Comando inicial: `mvnw.cmd -Dtest=MotorChatReglasTest,AiFinancialContextServiceTest,AiActionServiceTest,AiAssistantServiceTest,Whatsapp*Test test` (75 pruebas). Tras añadir la prueba HTTP de comparación se repitió `WhatsappConsultaIntegrationTest` (16 pruebas correctas, 15 ya incluidas y una nueva). `git diff --check` correcto. No se ejecutó la suite backend completa ni PostgreSQL en esta entrega; frontend sin cambios y funcionalidad todavía sin desplegar.

Pruebas unitarias del reconocimiento y los filtros no soportados; diferencias decimales exactas, meses cortos, cruce de año, ausencia de datos y rechazo de rangos inválidos. Pruebas de regresión del asistente y WhatsApp. Prueba HTTP/persistencia con datos sintéticos para verificar que solo se incluyen operaciones propias, las transferencias se excluyen y no cambian los saldos ni las cantidades de movimientos/propuestas/avisos.

Consultar el resultado final y el número de pruebas en `ESTADO_SESION.md`. Las pruebas de integración usan H2 y datos sintéticos; no son una prueba real del asistente desplegado.

## Lo que sigue para completar la etapa

1. Completar las consultas y casos funcionales restantes de la Etapa 7 y acordar el cierre del PR #97, que permanece en borrador. Presupuestos y plantillas recurrentes ya muestran alcance y valores pertinentes.
2. Validar en producción solo cuando exista autorización para integrar y desplegar; el CI y el flujo revisado por el propietario corresponden al preview, no a producción.

El asistente completo todavía no está terminado. Esta primera entrega no está desplegada. No activar correo ni conciliación como dependencias de estas tareas.

## Segunda entrega: evidencia de la comparación y acceso al historial

Validación local: 54 pruebas backend relacionadas correctas (incluidas 17 HTTP/persistencia H2), 57 pruebas Angular correctas, build de producción y diff-check correctos. No se ejecutó aquí toda la suite ni PostgreSQL. Las pruebas de integración contrastan total/conteo de evidencia con historial y CSV, con otra moneda y otro propietario presentes, sin escribir nuevos movimientos al consultar. La interfaz verifica navegación, renderizado y omisión de la lista compartida activa exclusivamente para evidencia propia.

`AiChatResponse.evidence` es una lista aditiva de evidencias calculadas en servidor. Cada fila contiene `label`, `desde`, `hasta`, `moneda`, `tipo`, `operaciones` y `total`. La comparación genera ingresos/gastos de ambos periodos para cada moneda incluida. Las cantidades y los conteos provienen de consultas autorizadas; el proveedor IA no genera esta evidencia.

El asistente y la captura/reportes muestran botones con periodo, moneda y cantidad de operaciones. Al abrirlos se navega a `/transacciones?alcance=propio&fechaInicio=...&fechaFin=...&moneda=...&tipo=...`. El historial incluye únicamente los movimientos propios, sin heredar la lista compartida seleccionada ni filtros anteriores. Una selección explícita de lista o limpiar filtros sale de ese alcance. También se admite abrir otro periodo de evidencia estando ya en el historial.

Los endpoints existentes de historial y CSV aceptan el filtro opcional `moneda`, validado como tres letras mayúsculas. Conservan la misma autorización y filtran por moneda de la cuenta o moneda histórica si la cuenta ya no existe. Las peticiones normales siguen usando la lista activa; solo la navegación de evidencia omite ese contexto para coincidir con el agregado propio.

La evidencia refleja los datos al consultar. El historial vuelve a leer los registros actuales, por lo que una edición posterior puede cambiar el resultado. No es un estado de cuenta inmutable. La gráfica semanal genérica del panel rápido no se muestra junto a una respuesta con evidencia de otro periodo.

Referencias técnicas: [Router.navigate](https://angular.dev/api/router/Router) y [Spring Data Specifications](https://docs.spring.io/spring-data/jpa/reference/jpa/specifications.html).
