# Estado para retomar la sesión

Actualizado: 6 de octubre de 2026. Este archivo es un punto de continuidad; verificar el estado actual antes de actuar.

## Objetivo y preferencias

El usuario pidió revisar e instalar nueve herramientas de IA y rediseñar su aplicación de finanzas, Kaptal, inspirándose en Expense Tracker - MonAi de Florian Vates, en get-monai.app. Confirmó que quería aplicar el rediseño en esta sesión.

El usuario quiere que el agente seleccione las skills pertinentes por su cuenta, sin exigir que las nombre. Comunicar en español. La preferencia está en `AGENTS.md`.

## Trabajo completado

- Revisadas UI/UX Pro Max, n8n-mcp, WorldFlowAI/everything-claude-code, OmniRoute, claude-mem, Emil Kowalski skills, Taste Skill, Cyber Neo y Replica Skill. Informe: `docs/HERRAMIENTAS_IA_REVISION.md`.
- Verificadas 51 skills de esas fuentes. Instaladas las 11 de Replica y la skill faltante Emil break-ui; reparada Cyber Neo, incluyendo un parche que evita mostrar secretos detectados en sus reportes. Conservadas las instalaciones completas anteriores.
- Reparados posteriormente los encabezados YAML de `ecc-eval-harness`, `ecc-project-guidelines-example` y `ecc-verification-loop`. Validados los encabezados de las 51 skills con parser YAML, sin errores; las tres reparadas ya aparecen en el catálogo de la sesión posterior. La validación inicial de procedencia había omitido esta incompatibilidad.
- n8n-mcp conectado para consultas y validación, con telemetría desactivada. Sin configuración de URL/API de una instancia para administrar workflows reales.
- claude-mem tiene plugin y servicio local activos en la última comprobación, con visor en localhost:37777. Verificar su disponibilidad si hace falta; no depender exclusivamente de la memoria para retomar.
- OmniRoute 3.8.51 estaba instalado globalmente. No se inició su servidor, no se conectaron proveedores ni se modificó la configuración de modelos de Codex. Los hooks y comandos exclusivos de Claude Code de ECC no se activaron.
- Implementado el rediseño Angular: tema marfil/terracota y oscuro, balance abierto, presupuestos con barras pastel, navegación móvil y botón de voz separados, panel de captura ajustado al viewport e iconos de categorías corregidos. Se repararon textos españoles con codificación dañada. Se preservó la lógica financiera.

## Validación y límites

- 149 pruebas del frontend pasaron en 18 archivos. Compilación de producción correcta, repetida después para investigar los warnings.
- Dos warnings de compilación: paquete inicial de 582.41 kB frente a presupuesto de 500 kB; CSS del login un byte por encima de 4 kB. No se aumentaron los límites para esconderlos.
- Comprobaciones de navegador con APIs interceptadas y datos sintéticos: ocho combinaciones de viewport/tema del dashboard, ocho comprobaciones de otras pantallas y estado vacío. 22 pares de contraste del tema pasaron. No se probó el micrófono físico ni el backend real.
- Resultados y capturas: `replica/verification.json`, `replica/browser-checks.json`, `replica/secondary-screen-checks.json`, `replica/screens/`. Decisiones de diseño: `replica/recon.md` y `replica/design/`.
- Existían muchos cambios locales del usuario antes de este trabajo; se preservaron. No hubo commit ni despliegue. No borrar, revertir ni atribuir todos los cambios del árbol de trabajo a esta sesión.

## Pendientes conocidos

- OmniRoute: seis alertas de dependencias, incluida una crítica de Next.js bajo condiciones específicas cuya explotabilidad en OmniRoute no quedó demostrada. Resolver y volver a verificar antes de activar con claves sensibles. Detalle en el informe de herramientas.
- Frontend: npm audit reportó seis paquetes afectados de herramientas de desarrollo, derivados de dos avisos directos (braces y http-cache-semantics) y sus cadenas. npm audit --omit=dev reportó cero. No se aplicó fix --force porque parte de la propuesta implica migrar Tailwind de versión mayor.
- Los dos warnings de tamaño siguen pendientes de optimización. No confundirlos con los cuatro avisos que indicó el usuario: esos eran los tres errores YAML ya corregidos y un aviso de cuota de Codex.
- El aviso “less than 50% of your 5h limit left” pertenece a la cuota de uso de la cuenta. Consultar /status dentro de Codex. No se corrige modificando el proyecto ni reiniciando la terminal.

## Punto exacto donde quedó la conversación

El usuario preguntó cómo se conservaría el contexto tras reiniciar. Se creó este resumen y se indicó su lectura en `AGENTS.md`. No hay una nueva tarea de implementación confirmada después de esa pregunta. Al retomar, explicar el estado si se solicita; no iniciar automáticamente una migración de Tailwind, OmniRoute, un despliegue o un rediseño adicional.

Para retomar en un chat nuevo: “Lee docs/ESTADO_SESION.md y continúa desde donde nos quedamos”.

## Retoma y diagnóstico de inicio del 4 de octubre de 2026

- Se recuperó el contexto y se comprobó que los cambios locales, el tema y los artefactos del rediseño siguen presentes. Las tres skills reparadas conservan sus encabezados. No se repitieron las pruebas ni la compilación del frontend en esta retoma.
- Nueva tarea del usuario: investigar «No active thread is available» al iniciar Codex. El usuario indicó que aparece en la aplicación de escritorio. Está pendiente identificar la ventana y el ejecutable concretos; en el entorno inspeccionado se encontraron la CLI y sus servicios, sin localizar la app gráfica registrada ni su proceso.
- `codex doctor --json` confirmó configuración, autenticación, conexiones HTTP/WebSocket, integridad del historial y servidor local correctos. CLI npm y servidor: 0.160.0. Otra copia independiente en `%LOCALAPPDATA%/Programs/OpenAI/Codex/bin`: 0.158.0. La relación entre esa copia y el aviso no está demostrada.
- El arranque de prueba de la CLI y `/status` funcionaron; se cerró la terminal de prueba sin enviar tareas al modelo. Se creó una sesión vacía de diagnóstico: para retomar el trabajo, elegir el chat correcto con el selector en vez de confiar inmediatamente en `--last`.
- El aviso de la app permanece sin reproducir y sin corregir. Detalles, límites y fuentes: `docs/DIAGNOSTICO_INICIO_CODEX.md`. No interpretar la salud de la CLI como prueba de que la app gráfica está corregida.
- Espacio libre medido en C: aproximadamente 1.8 GiB. No se ha establecido que cause el aviso. No se modificó la configuración de Codex ni se reinició su servidor compartido.

## Aclaración posterior del usuario

El usuario confirmó que la ventana es Codex CLI. La conversación actual y la prueba de inicio funcionaron; no hay evidencia de un bloqueo actual. El origen exacto del aviso sigue sin reproducirse. Si persiste o impide enviar mensajes, investigar la acción que lo dispara. Esta aclaración sustituye la referencia provisional a una app gráfica independiente.

## Revisión del alcance de interacciones

- El usuario pidió dejar el diagnóstico de inicio de Codex y comparar Kaptal con su documento de Features & UI Interactions, incluyendo sugerencias de mejoras.
- Se inspeccionó código actual de dashboard, captura, historial, asistente, categorías, configuración y filtros Spring. Skills aplicadas: ui-ux-pro-max y replica-diff.
- Informe completo: `docs/REVISION_FUNCIONALIDADES_MONAI.md`. Matriz independiente: `replica/alcance-interacciones/features.csv` y `parity.json`; 45 comprobaciones, 31 implementadas, 13 parciales y 1 ausente según inspección de código.
- Hallazgos prioritarios: Hoy/Semana no cambian las consultas mensuales; donut calcula total/porcentajes solo con las cuatro categorías visibles; el borrado disponible elimina también la cuenta; fase Categorizando declarada pero no utilizada; método de captura deducido por notas; drag de categorías sin implementación específica de pulsación larga táctil.
- Se documentaron diferencias razonables para una app web (teclado decimal, calendario propio, compartir/descargar PNG, Spring en lugar de Appwrite) y se recomendó conservar las funciones adicionales de Kaptal.
- En esta auditoría se generaron documentación y matriz, sin modificar código de aplicación ni ejecutar borrados. No se repitieron tests/build ni se probaron micrófono, bot, galería o backend en vivo. Las correcciones e integración en dispositivos siguen pendientes.

## Implementación autorizada después de la auditoría

- El usuario autorizó incluir, quitar o modificar las funcionalidades según criterio del agente. Se aplicaron ui-ux-pro-max y ecc-verification-loop y se mantuvo la comparación con replica-diff.
- Implementados rangos reales Hoy/últimos 7 días/fechas personalizadas en Angular y Spring; actividad reciente filtrada; regreso al mes actual y control de respuestas antiguas. Donut con Otros y total de todas las categorías de la moneda, accesible por teclado.
- FAB: toque abre formulario manual; mantener pulsado graba. Transcripción prepara propuesta con confirmación, fases de procesamiento cancelables, barras de audio real y limpieza del micrófono. Se mantiene el origen de voz al corregir categoría y se cargan categorías al abrir captura.
- Campo persistente nullable metodo_captura / metodoCaptura: TEXTO/VOZ en nuevas operaciones; se conserva en respaldos. Históricos sin dato muestran No registrado, sin heurísticas de notas. Enum WHATSAPP disponible, sin implementar una nueva captura entrante de WhatsApp.
- Arrastre táctil con pulsación larga de categorías y alternativas de botones; toasts superiores. Corregidos cuenta/categoría cargadas después de abrir formulario y botón Registrar ilegible en oscuro.
- Alcance ajustado: teclado decimal del sistema, calendario propio, compartir/descargar PNG, Spring propio. Borrado identificado inequívocamente como eliminar cuenta, incluyendo efecto sobre pareja. No se añadió un reinicio financiero conservando usuario ni se borraron datos reales.
- Validación actual: 158 pruebas frontend / 19 archivos, 213 pruebas backend, compilación correcta y diff --check limpio. Comprobaciones Chromium con API sintética en móvil claro/oscuro y escritorio: rangos, donut/teclado, FAB/formulario/cuenta, contraste, errores y overflow. Advertencias pendientes: bundle 584,91 kB / 500 kB y CSS login +1 byte / 4 kB. Sin medición de cobertura ni prueba de micrófono físico, bot, galería o producción.
- Informe: docs/AJUSTES_ALCANCE_INTERACCIONES.md. Artefactos actuales en replica/alcance-interacciones/verification.json, browser-checks.json, features-current.csv y parity-current.json; la auditoría inicial queda preservada como referencia histórica.
- No hubo commit ni despliegue. Se preservan los demás cambios locales. Hibernate usa ddl-auto:update; al publicar se requiere actualizar frontend/backend juntos y verificar la columna nueva. No se modificó la base de producción.


## Navegación y captura simplificadas (2026-10-04)

- Solicitud vigente: corregir iconos del menú inferior, quitar accesos de administración al pie del dashboard y el título visible Inicio, mejorar fechas/configuración, ocultar montos en toda la UI y simplificar gastos, ingresos, transferencias y voz.
- Skills aplicadas: redesign-existing-projects, ui-ux-pro-max y ecc-verification-loop. Se conservaron Angular y los tokens visuales existentes.
- Barra inferior con cinco posiciones fijas: Inicio, Actividad, Añadir, Planes y Reportes. Se retiraron el menú Más y el FAB superpuesto. SVG con viewBox y tamaños consistentes, objetivos táctiles de al menos 44 px y margen para el área segura.
- Cabecera del dashboard con Cuentas, ojito, configuración y actualizar. Fechas con selector y flechas arriba; sin título visible Inicio ni accesos Cuentas/Categorías/Recurrentes al pie. Configuración agrupa cuentas, categorías, recurrentes, libro diario y gastos compartidos.
- Nuevo RegistroRapidoComponent global: monto primero, tres tipos, cuenta/categoría predeterminadas y recordadas por usuario, selección directa y chips, descripción opcional, fecha/notas plegadas. Transferencias con origen/destino distintos, restricción entre tarjetas de crédito y cambio obligatorio entre monedas. Opciones avanzadas conservan el borrador al abrir el formulario completo.
- Se bloquea doble envío y se reutilizan payload/UUID de idempotencia tras una respuesta incierta. El reintento permanece disponible al cerrar/reabrir el panel durante esta sesión; no se afirma persistencia de ese borrador tras recargar. Dashboard e historial se actualizan tras guardar. El borrador se limpia si cambia el usuario.
- Ojito compartido entre pantallas, paneles y ajustes con la preferencia de PerfilService. MontoPipe conserva su comportamiento; se agregaron TextoFinancieroPipe para cifras dentro de respuestas/notas y MontoPrivadoDirective para campos monetarios editables. El texto financiero oculta todos sus números de forma conservadora; fechas/cantidades independientes y porcentajes de gráficas siguen visibles. Exportaciones CSV continúan conteniendo datos reales por acción explícita del usuario.
- Voz con Grabar / Detener y revisar y permiso explícito para enviar audio. Se espera el cierre del grabador antes de iniciar otro; se liberan pistas si el permiso llega tras cerrar. Se conserva cancelación de transcripción/categorización y confirmación antes de guardar. AI Reports se accede en la barra inferior.
- Validación: 170 pruebas frontend en 22 archivos, build correcto y comprobaciones Chromium con API sintética en 360/390 px claro, 390 px oscuro y escritorio 1280 px. Incluyen expense/income/transfer payloads, idempotencia, privacidad entre dashboard/formulario/configuración/cuentas/reportes, geometría del menú/panel, contraste >=4.5, rangos y ausencia de overflow/errores. Micrófono cubierto con dobles de prueba; no se verificó un dispositivo físico ni backend en vivo para esta tarea.
- Artefactos: replica/navegacion-captura/ (capturas, browser-check.mjs, browser-checks.json y verification.json). Se mantienen las evidencias anteriores en replica/alcance-interacciones como históricas.
- Advertencias de build: bundle inicial alrededor de 610 kB frente a presupuesto 500 kB y CSS de login 1 byte por encima de 4 kB. No se modificó backend, no hubo commit ni despliegue y se preservaron otros cambios locales.

- Comprobación final tras los últimos ajustes: 170/170 pruebas y 22/22 archivos con runner limitado (`--runner-config=../replica/navegacion-captura/vitest.config.mjs`), build exit 0 (609,87 kB inicial), Chromium 4/4 configuraciones y diff --check exit 0. Una ejecución previa simultánea con build agotó memoria; la repetición completa sin paralelizar archivos pasó. Logs finales en replica/navegacion-captura/.


## Chat unificado con reglas y memoria (2026-10-04)

- Solicitud vigente: todo registro nuevo de gasto, ingreso y transferencia por chat, junto con reportes; reglas e historial primero, IA solo para solicitudes complejas con permiso. Esta decisión sustituye el RegistroRapidoComponent como entrada global de la sección anterior.
- Skills aplicadas: backend-patterns, security-review y ecc-verification-loop. Se conservan Angular y Spring, sin nuevas dependencias ni migraciones.
- Añadir, dashboard y actividad abren QuickCaptureComponent. Reportes abre ese mismo chat y pide el resumen mensual, conservando su conversación. Se quitó la instancia global del formulario rápido; se conservan formularios de edición y administración.
- MotorChatReglas reconoce palabras, montos decimales, cuentas activas, categorías, ingreso/gasto/transferencia, hoy/ayer/anteayer y fechas exactas. Hoy corresponde a America/Mexico_City. Pregunta en el chat cuando falta monto, tipo o cuentas; usa contexto de aclaración y sugerencias. No guarda nada al interpretar: requiere confirmar una propuesta temporal del usuario.
- Memoria financiera: cuenta usada recientemente para ese tipo y categoría de conceptos coincidentes en movimientos confirmados recientes del propio usuario. Luego aplica diccionario de palabras. No depende de claude-mem ni inventa categorías. Permite guardar sin categoría; transferencias no la requieren. Restricciones de crédito, cuentas distintas y cambio entre monedas preservadas.
- Reportes locales del servidor: ingresos/gastos/balance del periodo, gastos por categoría, saldos actuales, presupuestos mensuales y recurrentes. Reutilizan agregados SQL por usuario; no mezclan monedas en gráficas. Rangos: hoy, semana actual/anterior, mes actual/anterior, últimos 7 días o fecha exacta. Consultas más complejas o rangos no soportados requieren permiso de IA. El chat conserva privacidad y permite exportar gráficos PNG.
- La pantalla antigua /asistente también usa reglas antes del proveedor y admite solicitudes locales sin consentimiento. Se eliminó su ping automático al proveedor al abrirla. El chat rápido restringe acciones a crear movimientos y consultar, evitando confirmar borrados con un botón de guardar.
- Voz mantiene transcripción externa con permiso separado. Permitir audio no activa el consentimiento para compartir contexto financiero con IA. Se conserva cancelación, limpieza del micrófono y confirmación. El historial local del chat se limpia al cambiar usuario; Limpiar chat no borra transacciones.
- Hooks: desactivados ambos registros del plugin claude-mem y sus cinco hooks en C:/Users/yaxti_cm5rg3t/.codex/config.toml. Backup: config.toml.before-claude-mem-20261004-204326.bak, junto a la configuración. La sesión ya abierta puede conservar hooks cargados: cerrar y volver a abrir Codex para aplicar completamente. No se borraron memorias ni se desactivaron los demás plugins.
- Validación: 174 pruebas frontend / 22 archivos; suite backend 232 pruebas sin fallos, más repetición dirigida tras ajustar reglas de fechas. Build de producción correcto. Chromium con API sintética: 360/390 px claro, 390 px oscuro y escritorio, entrada por chat, confirmación, reportes en la misma conversación y ausencia de overflow/errores. Se bloquearon service workers en esta prueba para que las peticiones usen la API sintética. No se probó micrófono físico, IA real ni base de producción.
- Artefactos: replica/chat-reglas/ con logs, pruebas de navegador, capturas y verification.json. Persisten advertencias de presupuesto de bundle (~603 kB frente a 500 kB) y CSS login (+1 byte). Sin commit ni despliegue; se preservaron cambios previos.

## Correcciones por etapas: etapa 1 de sesiones (2026-10-06)

- El usuario pidió una revisión general del proyecto y luego autorizó corregir todos los hallazgos por etapas: terminar una, revisarla y continuar con la siguiente. Se dividió la prioridad inicial en bloques independientes. Plan completo: `docs/PLAN_MEJORAS_PROYECTO.md`.
- Skills aplicadas en la implementación: security-review y ecc-verification-loop. Cyber Neo se usó en la auditoría anterior; no limita la implementación autorizada en este nuevo turno.
- Etapa 1 terminada y verificada localmente: revocación persistente tras rechazar una sesión, bloqueo por usuario para emisión/rotación/revocación, recarga de entidades bajo bloqueo, invalidez inmediata de access tokens en revocación global y manejo JSON 401 explícito. Un token de una versión anterior no puede cerrar un inicio de sesión posterior. No hay tablas, columnas ni dependencias nuevas.
- Frontend: orden correcto de interceptores; fallos temporales no borran sesión; renovación compartida y coordinación entre pestañas con Web Locks; reutilización de token nuevo ante 401 tardío; un solo cierre para peticiones concurrentes; eventos de almacenamiento retiran la pantalla anterior al cambiar/salir de otra pestaña; respuestas antiguas no restauran sesiones cerradas ni borran una cuenta nueva.
- Primero se reprodujeron cinco fallos backend con pruebas sin transacción de clase y el cierre prematuro frontend con los proveedores reales de appConfig. Se agregaron 8 pruebas backend y 12 frontend de regresión.
- Validación final: 240 pruebas backend / 36 suites y 186 frontend / 23 archivos, sin fallos. Compilación Angular de producción correcta. Chromium con dos pestañas sobre el build real y API sintética: una sola renovación, cierre compartido, salida al login y cero errores JavaScript. Diff de los archivos de esta etapa sin errores de espacios (CRLF permitido).
- Límites: backend probado con H2, sin PostgreSQL real ni producción; navegador con service workers bloqueados y API sintética. Sin cobertura porcentual. Advertencias conservadas: bundle 604.63 kB / 500 kB y CSS login +1 byte / 4 kB. Access token en localStorage, CORS, gestión por dispositivo y otras mejoras de seguridad siguen en su etapa futura.
- Informe: `docs/MEJORAS_ETAPA_1_SESIONES.md`. Evidencias: `replica/mejoras-etapa1/browser-sesiones.mjs`, `browser-checks.json`, `verification.json` y `backend/target/surefire-reports/`.
- No hubo commit ni despliegue; se preservaron cambios anteriores y no se modificó la base de producción.
- Punto de continuidad: presentar/revisar la etapa 1. La siguiente es exactitud financiera (MSI, compra/cuotas, centavos, recurrencias y zona horaria). No iniciar automáticamente esa etapa en el mismo turno: el usuario pidió revisión entre etapas.

## Continuación: Caveman y etapa 2 (2026-10-06)

- El usuario autorizó continuar después de la etapa 1 y pidió instalar `https://github.com/JuliusBrussee/caveman` primero. Se instaló `skills/caveman` mediante skill-installer en `C:/Users/yaxti_cm5rg3t/.codex/skills/caveman`, fijando el commit `99aafe151a1be72be783e662858e8a0955add59f`. El archivo instalado coincide byte por byte con ese origen; evidencia en `replica/mejoras-etapa2/caveman-instalacion.json`. Sin proxy, hooks, CLI ni dependencias nuevas.
- Caveman apareció en el catálogo de skills durante el mismo turno. El usuario preguntó si podía usarlo sin cerrar la sesión: se confirmó y se activó para respuestas breves en español. No hace falta reiniciar esta sesión. Código y documentos mantienen redacción normal. Seguir aplicándolo hasta que el usuario pida modo normal.
- Skills de implementación: security-review, ecc-verification-loop y ui-ux-pro-max. Correcciones de etapa 2 verificadas para registros nuevos: cuotas MSI exactas con ajuste final de centavos, importe pendiente, UUID común entre compra/plan/cuotas, bloqueo de edición/borrado individual de cuotas, cancelación que libera solo lo pendiente y pausa que conserva retención. No se reanuda un plan completado.
- Crédito disponible Angular descuenta retención. Cambiar límite de tarjeta cubre también lo comprometido. Fechas recurrentes con ancla persistente; día 30 sobrevive a febrero, fin de mes y aniversario bisiesto se preservan, primera fecha personalizada define su propia ancla. Corregido formulario anual que antes podía convertir febrero 29 en marzo 1.
- CalendarioFinanciero concentra el día civil de America/Mexico_City, con comprobación mediante Clock fijo. Lo usan servicios financieros, recordatorios, reglas/contexto de IA y respaldo; vencimientos de Recurrentes usan la misma zona en Angular.
- Respaldos nuevos versión 2 preservan retención, cuotas totales/pagadas, pendiente, ancla y vínculo; importación admite versiones 1 y 2 y valida consistencia. Se comprobó exportar/restaurar un plan parcialmente pagado y terminarlo sin retención sobrante. Cuatro columnas nuevas nullable; SQL aditivo de referencia en `docs/sql/ETAPA_2_EXACTITUD_FINANCIERA.sql`, no ejecutado en PostgreSQL.
- Límite real pendiente: MSI históricos sin total original/vínculo no se reconstruyen automáticamente. El respaldo anterior omitía cuotas y retención; la vista previa avisa cuando falta retención. Compatibilidad con planes antiguos calcula pendiente por cuota × restantes y fija ancla en el próximo vencimiento conocido; no recupera centavos originales ni protege automáticamente movimientos antiguos sin vínculo. Conciliar esos datos antes de publicar. No se cambiaron saldos reales ni se usaron heurísticas por descripción.
- Validación final: 256 pruebas backend / 37 suites y 190 frontend / 24 archivos, sin fallos. Build Angular correcto; Chromium sobre build real con API sintética, service workers bloqueados y movimiento reducido: 360 px claro, 390 px oscuro, escritorio y horizontal. Pendiente exacto, plan completado sin reanudación, confirmación antes de DELETE, cancelar diálogo sin petición, controles de cancelación ≥44 px y sin overflow/errores JavaScript. Backend con H2, sin PostgreSQL real; sin cobertura porcentual. Advertencias conservadas: bundle inicial 604.63 kB / 500 kB y CSS login +1 byte / 4 kB.
- Informe: `docs/MEJORAS_ETAPA_2_EXACTITUD_FINANCIERA.md`. Logs finales, capturas, pruebas de navegador y `verification.json` en `replica/mejoras-etapa2/`. Los intentos anteriores quedan como evidencia histórica; el primer caso de restauración falló por omisión de retención y ya pasó tras corregirlo.
- Sin commit ni despliegue. Cambios anteriores preservados. Punto de continuidad: revisar la etapa 2 y su límite histórico; después seguir con etapa 3 de gastos compartidos. No iniciar etapa 3 antes de presentar este resultado, respetando la revisión entre etapas.

## Continuación: etapa 3 de gastos compartidos (2026-10-06)

- El usuario autorizó continuar tras etapa 2. La etapa 3 queda implementada y verificada para revisión. No se inició etapa 4. Ante su pregunta posterior se confirmó que Caveman sigue activo en español y no requiere reinicio; los documentos y el código mantienen redacción normal.
- Skills aplicadas: security-review, ecc-verification-loop y ui-ux-pro-max. Se preservaron cambios locales anteriores.
- Nuevos vínculos mediante invitación inactiva, aceptación exclusiva del destinatario, rechazo/cancelación y reintentos sin duplicados. Se guardan nombre/correos originales de invitación para no revelar cambios posteriores de perfiles pendientes. Límite de 20 invitaciones por miembro; notificaciones solo dentro de la aplicación, sin envío externo.
- Permisos por autor para borrar aportes, gastos y pagos. Nuevo registradoPor en pagos; pagos antiguos sin autor conocido permanecen de solo lectura. Bloqueos ordenados y consultas de IDs corrigen carreras de doble aceptación, aceptación de vínculos diferentes, creación simultánea, desvinculación/movimientos y borrado/aceptación. Pruebas de concurrencia con confirmaciones reales y comprobaciones HTTP 403.
- Desvincular conserva historial de consulta. Eliminar cuenta conserva registros compartidos del miembro restante con referencia anónima deshabilitada; limpia usuario original, sesiones, finanzas propias y contacto de invitación. Borrado de ambos miembros elimina historial y referencias huérfanas. No se redactan automáticamente conceptos/notas escritos por usuarios.
- Respaldos nuevos versión 3; importación admite 1/2/3. Todo historial restaurado es copia privada e inactiva. El otro participante se toma exclusivamente del archivo y se representa con referencia histórica deshabilitada, incluso si existe una cuenta real con ese correo. No se vincula ni consulta su perfil actual. Se conservan autoría y repartos; no se reactiva consentimiento desde un archivo.
- UI separa invitaciones, vínculo actual e historial; confirma aceptar/eliminar, oculta borrado ajeno y explica pagos históricos. Corregidos dirección de pagos, cierre del indicador tras respuesta síncrona, doble envío, vista previa del reparto y deuda cero. Repartos nuevos no dejan una parte en cero por redondeo. Fondo claramente virtual, sin escrituras en cuentas personales.
- Resultado final: backend 281 pruebas / 39 suites, frontend 198 / 24 archivos, build Angular de producción correcto y Chromium 4/4 escenarios (360 claro, 390 oscuro, 1280 escritorio, 844×390 horizontal), sin desbordamientos ni errores JavaScript. Navegador usa API sintética y dos contextos; service workers bloqueados, movimiento reducido. Backend H2, sin PostgreSQL real ni cobertura porcentual. Bundle inicial 604.64 kB / 500 kB y CSS login +1 byte permanecen como advertencias.
- Informe: docs/MEJORAS_ETAPA_3_GASTOS_COMPARTIDOS.md. Evidencias, capturas y verification.json en replica/mejoras-etapa3/. SQL aditivo de referencia: docs/sql/ETAPA_3_GASTOS_COMPARTIDOS.sql, no ejecutado en PostgreSQL. Se mantiene ddl-auto:update; migraciones formales en etapa 6. Actualizar frontend/backend juntos al publicar.
- Límites previos conservados: conciliar MSI históricos sin total/vínculo original. Vínculos activos anteriores siguen activos, sin fecha de aceptación inventada: revisar o renovar consentimiento antes de publicar. Operaciones financieras compartidas tienen bloqueo de doble envío en UI, pero falta UUID de idempotencia para respuestas inciertas; pendiente en etapa 7.
- Sin commit, despliegue ni cambios en producción. Punto de continuidad: presentar/revisar etapa 3; siguiente etapa 4 de chat, después de la continuación del usuario. Confirmar evidencia actual al retomar.
