# Auditoría funcional y visual: Etapa 8

Publicación: [PR #99](https://github.com/YaxcheItz/gestorfinanzas/pull/99) abierto hacia develop desde `auditoria/etapa-8-funcional-visual`, implementación `2e5b13a`. Listo para revisión, sin integrar ni desplegar producción; CI en curso al publicar. Los cortes siguientes conservan su estado histórico local y no sustituyen esta actualización.

## Cierre técnico para PR hacia develop (2026-10-21)

El propietario autorizó publicar la rama y abrir PR hacia `develop`; no autorizó integrar ni desplegar producción. Se conserva la auditoría como etapa abierta hasta resolver las comprobaciones manuales restantes.

- Suite frontend completa: **366 correctas en 43 archivos**.
- Backend `mvnw -B verify`: **491 ejecutadas, 485 correctas y 6 omitidas**, cero fallos/errores; JAR construido. PostgreSQL no se ejecutó localmente; lo comprueba CI.
- Regresión E2E anterior: 20 correctas. Tras el último cambio se probaron Cuentas y recurrencias: **5 correctas**, 3 ya incluidas antes y 2 nuevas; 22 escenarios distintos cubiertos entre las ejecuciones, no una ejecución única de 25.
- Recurrencias desde interfaz y API local real: registrar una ocurrencia, editar toda la serie/esta y siguientes/solo una, pausar/reanudar y eliminar la plantilla conservan dos gastos y saldo final 950 desde 1000, con gastos de 25. La selección inicial de radios de la prueba se corrigió para usar su nombre accesible; no era un defecto de la app.
- Cuentas ahora toma el día civil de México, coherente con el backend, incluso si el navegador UTC ya está en el día siguiente. E2E con reloj fijo conserva el vencimiento ajustado pendiente.
- Build producción correcto. Dependencias: ninguna vulnerabilidad conocida en producción; cinco alertas de desarrollo sin parche publicado, registradas por el comprobador existente. Diff-check correcto.

Datos sintéticos y proveedores simulados. Sin mensajes externos ni movimientos reales. Gmail deshabilitado. No se ejecutó una sesión autenticada de producción, Android físico ni lector de pantalla real. Los resultados automatizados no sustituyen esas comprobaciones.

## Tercer corte — calendario bancario y ampliación de recorridos (2026-10-21)

Investigación, fuentes oficiales, alcance y mantenimiento en [TARJETAS_CALENDARIO_MX.md](TARJETAS_CALENDARIO_MX.md). El corte mantiene su día configurado; el pago mensual base se ajusta al siguiente día hábil del calendario nacional MX verificado. Pantalla y servidor comparten un único JSON de fechas y un contrato con 13 casos. No se alteran cargos ni días guardados. Si falta el calendario anual, se avisa y no se difiere la fecha base.

Ejemplo: base 15/11/2026 → 17/11/2026 por domingo y festivo bancario del lunes. La búsqueda del próximo pago compara la fecha ajustada: durante la espera no salta al mes siguiente. El formulario distingue día base de fecha ajustada; los avisos siguen siendo estimaciones a contrastar con el emisor.

Verificación de lógica: 41 pruebas frontend correctas (28 Cuentas + 13 calendario); 48 backend correctas (16 recordatorios, 1 contrato de calendario con 13 casos, 15 Cuentas y 16 exactitud). Se reprodujeron primero seis fallos de recordatorios al aplicar el nuevo contrato; ahora pasan. Build de producción correcto. No confundir estos conteos con una ejecución completa de todas las suites.

Regresión final: **20 E2E correctas**, con Inicio/repetir, listas/etiquetas/permisos y registro responsive, además de los archivos del segundo corte. Estos escenarios usan usuarios sintéticos y el backend local de pruebas; no acreditan la producción autenticada ni un Android físico. Build y diff-check correctos. La rama sigue local, sin commit/push/merge/despliegue.

## Segundo corte — tarjetas y texto grande (2026-10-21)

Fetch vuelve a confirmar `HEAD = origin/develop = a8ae7f3`. Misma rama de auditoría, sin publicar ni modificar datos reales.

Hallazgos reproducidos y corregidos:

- `frontend/src/app/features/cuentas/cuentas.component.ts`: la tarjeta ignoraba `diaPago` y mostraba corte + 20 días; el formulario era de solo lectura y podía guardar esa estimación al faltar el día. Ahora usa el día de cada cuenta, permite editarlo y exige un entero de 1 a 31. Si falta, pide configurarlo. La fecha mostrada sigue siendo una proyección de la configuración, no una fecha certificada por el banco.
- `backend/src/main/java/com/gestionfinanzas/service/RecordatorioNotificacionService.java`: el recordatorio usaba también corte + 20 días. Ahora el aviso de corte y la detección del vencimiento usan el día configurado, con ajuste al último día de meses cortos. Se probaron febrero normal/bisiesto y cruce de año, con WhatsApp simulado y sin enviar mensajes reales.
- `frontend/src/monai-theme.css`: con texto al 200 %, los datos de crédito desbordaban la tarjeta. Los párrafos pueden dividir palabras largas y la cuadrícula pasa a una columna cuando no caben ambas. Se comprueban los límites de cada párrafo y el ancho total, sin ocultar ni truncar los importes.

Reproducción con fecha fija 2026-10-21: tarjeta con corte 10/pago 15 mostraba 30 oct en vez de 15 nov; el campo de pago no se podía editar. La prueba E2E falló antes y pasó después; también comprueba que editar a 17 envía `diaPago: 17`. La prueba de texto grande falló antes y pasó después. Se usan nombre y descripción sin espacios e importes de miles de millones, con fuentes raíz de 16 y 32 px en viewport 320 px. Esto no certifica el zoom nativo ni accesibilidad en todas las pantallas.

Regresión final de navegador: 16 E2E correctas (los siete archivos indicados abajo), incluidas las dos nuevas. Pruebas actuales del componente Cuentas: 25 correctas, incluidas siete fechas/ciclos y rechazo de día ausente, fraccionario o fuera de rango. Backend seleccionado: 53 correctas (15 CuentaService, 16 exactitud, 11 cierre de presupuestos/recurrencias, 11 recordatorios), cero fallos/errores/omisiones. Cinco casos nuevos de recordatorios fallaron primero y pasan después. Build de producción y diff-check correctos. No se repitieron las suites completas ni PostgreSQL.

Los valores ya guardados se conservan: si una tarjeta contiene un día proveniente de la estimación anterior, hay que contrastarlo con su estado de cuenta. Esta entrega no intenta adivinarlo ni migra cargos históricos.

Para repetir, añadir `auditoria-cuentas` al comando E2E del primer corte. Para unitarias usar `--include=src/app/features/cuentas/cuentas.component.spec.ts`. Backend: `-Dtest=RecordatorioNotificacionServiceTest,CuentaServiceTest,ExactitudFinancieraIntegrationTest,PresupuestosRecurrenciasCierreIntegrationTest`.

## Primer corte comprobado — 2026-10-21

Rama `auditoria/etapa-8-funcional-visual`, en `.local/asistente-worktree`. Fetch comprobó HEAD/origin/develop `a8ae7f3`. Se conservaron los cambios documentales existentes. Entrega local sin commit, push, merge ni despliegue. Datos sintéticos y H2; los escenarios de presentación interceptan la API. No se manipuló información financiera real. Gmail deshabilitado; Etapa 6 omitida.

## Hallazgo corregido

`frontend/src/app/shared/components/quick-capture/quick-capture.component.ts:839`: los errores de audio culpaban a Firefox incluso en Chrome y recomendaban actualizar Firefox sin comprobar el navegador. Ahora indican conexión segura, permisos del sitio o escritura manual según el problema.

Reproducción: abrir captura por texto, pulsar dictar, consentir audio y denegar `getUserMedia` con `NotAllowedError`. La nueva prueba falló primero en Chromium mostrando «Firefox bloqueó el micrófono»; después pasa, permite seguir escribiendo y comprueba que no se envía audio ni se registra un movimiento. El permiso se simula; no equivale a probar un micrófono físico.

Otra prueba comprueba el enlace «Ir al contenido»: permanece compacto hasta recibir foco por Tab, aparece en pantalla y Enter lleva el foco a `main`.

## Evidencia ejecutada

| Comprobación | Resultado |
| --- | --- |
| Playwright: app-shell-movil, chat-android, historial-movil, periodos-flexibles, presupuestos-recurrencias, registro-rapido | 14 correctas |
| Componente QuickCapture | 27 correctas |
| CuentaServiceTest | 15 correctas |
| ExactitudFinancieraIntegrationTest | 16 correctas |
| PlantillaRecurrenteServiceTest | 3 correctas |
| PresupuestosRecurrenciasCierreIntegrationTest | 11 correctas |
| Build Angular de producción y git diff --check | Correctos |

Backend: 45 pruebas seleccionadas, cero fallos, errores u omisiones. No se repitieron las suites completas ni PostgreSQL. El puerto 14200 estaba ocupado; se usó 14208 sin detener el proceso ajeno. La ejecución inicial de 12 E2E pasó; el resultado final de 14 incluye las dos nuevas y no se suma al anterior.

Cobertura: carga sin JavaScript e interrumpida, anchos de 320/390 px y horizontal 568×320, foco y geometría de teclado, recuperación, ajustes/protección del borrado, búsqueda/filtros/detalle, privacidad, rango Inicio/informe/historial, catorcena bisiesta/cruce de año, presupuesto por lista/moneda/umbral y restauración, captura rápida, persistencia offline y reintentos sin duplicados. Backend comprueba restricciones de tarjetas, exactitud contable, meses cortos y final/modificación de recurrencias; no constituye cobertura total de cada función.

Capturas locales en `frontend/test-results/`, ignoradas por Git y reemplazadas al repetir Playwright. Se inspeccionaron `chat-viewport-reducido.png` y `presupuestos-movil.png`: escritura/guardado disponibles con viewport reducido y presupuesto excedido legible, sin otro fallo observado en esas imágenes. Revisión guiada por [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md); no es certificación WCAG completa.

Repetir desde `frontend` en PowerShell:

```powershell
$env:E2E_FRONTEND_PORT='14208'
npx playwright test app-shell-movil periodos-flexibles presupuestos-recurrencias historial-movil registro-rapido chat-android --reporter=list
npm test -- --watch=false --include=src/app/shared/components/quick-capture/quick-capture.component.spec.ts
npm run build
```

Desde `backend`:

```powershell
.\mvnw.cmd "-Dtest=CuentaServiceTest,PlantillaRecurrenteServiceTest,PresupuestosRecurrenciasCierreIntegrationTest,ExactitudFinancieraIntegrationTest" test -q
```

## Pendientes para cerrar

- Producción autenticada: asistente/evidencias/historial/CSV, presupuesto disponible y recurrencias, solo lectura.
- Android físico: teclado, permiso concedido/denegado, dictado/transcripción, giro, regreso del fondo, modo instalado y red intermitente. La emulación no valida hardware ni ciclo de vida del sistema.
- Ampliar texto al 200 %, nombres sin espacios e importes extremos al resto de pantallas; lector de pantalla, listas extensas/paginación y temas/privacidad. Cuentas ya tiene la prueba descrita en el segundo corte.
- Confirmar tarjetas/corte/pago con estados de cuenta reales, solo lectura; ampliar cancelación de cuotas MSI desde interfaz. Edición por instancia/futuras/toda la serie, pausa y eliminación de plantillas normales ya comprobadas en el cierre técnico.
- Revisar CI del PR hacia develop y coordinar integración/despliegue cuando corresponda.

La Etapa 8 sigue abierta. Después viene Etapa 9 (Android/captura), en otra rama desde develop actualizado.
