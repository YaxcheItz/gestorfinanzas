# Asistente financiero con evidencias

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

1. Filtros explícitos por categoría, cuenta/lista autorizada y rangos definidos; aclarar ambigüedades antes de consultar.
2. Extender la evidencia ya disponible para comparación mensual al resto de consultas; después incorporar enlaces equivalentes en las respuestas WhatsApp.
3. Restante de presupuesto, recurrencias y tendencias sencillas sustentadas en datos existentes, sin atribuir gastos futuros como hechos.
4. Interfaz conversacional y sugerencias con carga/vacío/error coherentes, usando los componentes actuales.
5. Pruebas de aislamiento, cálculos contrastados con reportes/historial, publicación de la rama, CI y despliegue antes de validación real.

El asistente completo todavía no está terminado. Esta primera entrega no está desplegada. No activar correo ni conciliación como dependencias de estas tareas.

## Segunda entrega: evidencia de la comparación y acceso al historial

Validación local: 54 pruebas backend relacionadas correctas (incluidas 17 HTTP/persistencia H2), 57 pruebas Angular correctas, build de producción y diff-check correctos. No se ejecutó aquí toda la suite ni PostgreSQL. Las pruebas de integración contrastan total/conteo de evidencia con historial y CSV, con otra moneda y otro propietario presentes, sin escribir nuevos movimientos al consultar. La interfaz verifica navegación, renderizado y omisión de la lista compartida activa exclusivamente para evidencia propia.

`AiChatResponse.evidence` es una lista aditiva de evidencias calculadas en servidor. Cada fila contiene `label`, `desde`, `hasta`, `moneda`, `tipo`, `operaciones` y `total`. La comparación genera ingresos/gastos de ambos periodos para cada moneda incluida. Las cantidades y los conteos provienen de consultas autorizadas; el proveedor IA no genera esta evidencia.

El asistente y la captura/reportes muestran botones con periodo, moneda y cantidad de operaciones. Al abrirlos se navega a `/transacciones?alcance=propio&fechaInicio=...&fechaFin=...&moneda=...&tipo=...`. El historial incluye únicamente los movimientos propios, sin heredar la lista compartida seleccionada ni filtros anteriores. Una selección explícita de lista o limpiar filtros sale de ese alcance. También se admite abrir otro periodo de evidencia estando ya en el historial.

Los endpoints existentes de historial y CSV aceptan el filtro opcional `moneda`, validado como tres letras mayúsculas. Conservan la misma autorización y filtran por moneda de la cuenta o moneda histórica si la cuenta ya no existe. Las peticiones normales siguen usando la lista activa; solo la navegación de evidencia omite ese contexto para coincidir con el agregado propio.

La evidencia refleja los datos al consultar. El historial vuelve a leer los registros actuales, por lo que una edición posterior puede cambiar el resultado. No es un estado de cuenta inmutable. La gráfica semanal genérica del panel rápido no se muestra junto a una respuesta con evidencia de otro periodo.

Referencias técnicas: [Router.navigate](https://angular.dev/api/router/Router) y [Spring Data Specifications](https://docs.spring.io/spring-data/jpa/reference/jpa/specifications.html).
