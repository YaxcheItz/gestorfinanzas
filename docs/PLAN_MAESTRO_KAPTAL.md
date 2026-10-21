# Kaptal: plan maestro y traspaso al siguiente chat

## Avance local del asistente (2026-10-21)

Se implementaron filtros autorizados por lista activa, evidencias reproducibles por lista y autor, y evidencia de presupuesto con el mismo periodo, moneda, categoría y lista del cálculo. Chat y WhatsApp comparten el alcance; las consultas de saldo y recurrencias rechazan filtros de lista que no soportan. Se conservan los filtros explícitos de cuenta/categoría/fechas y la evidencia “Sin categoría”. Ver cambios y cobertura en [ASISTENTE_EVIDENCIAS.md](ASISTENTE_EVIDENCIAS.md).

Validación local: backend `mvnw -B verify` con 478 pruebas correctas y 6 omitidas; 72 pruebas dirigidas de filtros y evidencias; 343 pruebas frontend, build de producción y `npm run security:check` correctos. Producción sin vulnerabilidades conocidas; cinco alertas conocidas permanecen solo en dependencias de desarrollo según el control del proyecto.

El cambio funcional se publicó en el commit `c93e00a` de `mejoras/asistente-evidencias` y PR #97 permanece abierto como borrador. Todos los checks públicos del SHA completo `c93e00a6e083c35089ff5a85f3676f292b1c81f4` concluyeron correctamente: backend, PostgreSQL, frontend, E2E, WhatsApp Cloudflare, canales personales y Vercel Preview. Es un preview, no un merge ni un despliegue de producción. La Etapa 7 completa sigue abierta para sus comprobaciones funcionales restantes; Gmail continúa deshabilitado y Etapa 6 omitida.

El propietario confirmó que las comprobaciones manuales del flujo de evidencia en la página del preview funcionaron. Esto cierra esa revisión del flujo, pero no confirma el despliegue de producción ni completa por sí solo todas las consultas previstas para la Etapa 7. El PR permanece en borrador mientras se define su cierre.

Continuación funcional: las respuestas de presupuesto informan lo gastado, límite, disponible y moneda para cada categoría; el disponible conserva signo cuando el gasto supera el límite. Prueba unitaria y suite backend completas pasan.

La mejora de presupuesto se publicó en `0b495ee`; su CI (backend, PostgreSQL, frontend, E2E, WhatsApp Cloudflare, canales personales y Vercel Preview) está verde. No es una integración ni un despliegue de producción.

También se completó localmente la consulta de recurrencias: distingue gastos, ingresos y plantillas genéricas; informa tipo, cuenta, categoría, importe, moneda, frecuencia y fecha siguiente. La frase del usuario determina el tipo filtrado y el asistente aclara que una plantilla no es un movimiento ejecutado. Las consultas de saldo y recurrencias por lista siguen rechazadas porque ese alcance no aplica. La suite backend completa pasó (480 pruebas, 6 omitidas); queda publicar este ajuste y verificar CI.

## Prioridad vigente: solo WhatsApp y asistente (2026-10-20)

Archivo solicitado posteriormente: el borrador Gmail se conserva mediante commit LOCAL en `mejoras/gmail-bancario-piloto`, sin subirlo ni integrarlo. El checkout principal queda sin cambios pendientes; el trabajo activo del asistente continúa en su worktree y PR #97. Secretos y artefactos quedan fuera de Git; no reactivar Gmail al retomar este archivo.

La última decisión del propietario sustituye el orden anterior: **solo WhatsApp como canal externo disponible**, Gmail deshabilitado y **Etapa 6 omitida**. No reactivar Gmail, sincronización de correo, conciliación multicanal, SMS ni lectores bancarios sin una nueva petición. La captura manual y el chat de la app se conservan. No se eliminan credenciales, historia, avisos ni el trabajo Gmail sin publicar.

Estado comprobado: Gmail local bloqueado por `gmailPaused: true`, reglas bancarias privadas deshabilitadas y revisión manual conservada; Worker Gmail pausado, sin sesión Kaptal importada y sin eventos. WhatsApp `/health` y `/ready` HTTP 200. La prueba inicial con urllib sin User-Agent fue rechazada; la comprobación con User-Agent operativo devolvió 200. No se cambiaron webhook ni Worker WhatsApp.

### Plan completo que queda, en el nuevo orden

1. **Asistente financiero con evidencias (Etapa 7, actual).**
   - Reutilizar el chat y las consultas WhatsApp existentes; reglas primero y proveedor IA solo para interpretación autorizada.
   - Consultas exactas por periodo, categoría, cuenta/lista autorizada y moneda; comparaciones equivalentes, presupuesto restante y recurrencias.
   - Mostrar periodo y alcance, monedas separadas, número de operaciones/filtros considerados y enlace al historial correspondiente; explicar cuando faltan datos.
   - No delegar cuentas ni cálculos al LLM; consultas de solo lectura, permisos por usuario y pruebas contra reportes/historial.
   - Primera entrega iniciada: comparación mensual textual determinista en backend, con periodos equivalentes y sin movimientos nuevos. No equivale a asistente completo ni a despliegue.
2. **Auditoría funcional y visual (Etapa 8).**
   - Revisar en Android físico Inicio, formularios, teclado, voz/permisos, letra grande, temas y privacidad.
   - Verificar los mismos rangos y cifras entre Inicio, historial y reportes; tarjetas/cortes/vencimientos por cuenta, presupuestos y recurrencias idempotentes.
   - Revisar búsquedas, listas/etiquetas, paginación y rendimiento; corregir fallos demostrados sin rehacer funciones existentes.
   - Validar borradores y capturas offline, sincronización única y estados de error/pendiente claros.
3. **Android y captura desde el sistema (Etapa 9).**
   - Comprobar primero la PWA; evaluar envoltura de la app existente, autenticación, enlaces, safe areas, teclado y offline.
   - Acceso rápido para registrar y voz, incluyendo Quick Settings Tile si es viable; permisos al usar y protección con pantalla bloqueada.
   - Recordatorios propios de vencimientos/presupuestos/recurrencias y preferencias de privacidad; widgets solo al estabilizar sincronización.
   - Prueba real: capturar con app cerrada/sin red y sincronizar exactamente una vez. Esto no habilita lectura de SMS ni notificaciones bancarias ajenas.
4. **Compartido, divisas y metas (Etapa 11).**
   - Auditar y completar invitaciones, roles, autoría, salida y revocación de listas compartidas.
   - Repartos y liquidaciones con redondeo exacto y sin contar dos veces el gasto; pruebas de permisos y concurrencia.
   - Moneda original, tipo de cambio con fecha/fuente, equivalencias y saldos por moneda, sin convertir el pasado al cambiar la visualización.
   - Metas con aportes/retiros entre fondos propios, progreso y cancelación sin inflar ingresos/gastos.
5. **Onboarding, privacidad y acabado nativo (Etapa 12).**
   - Inicio guiado breve y omitible; accesibilidad, foco, lectores de pantalla, formatos y letra grande.
   - Bloqueo/biometría cuando exista soporte nativo real, privacidad al volver del fondo y ocultación de datos en vistas previas.
   - Interacciones táctiles, movimiento reducido, zonas de toque y alternativas a gestos.
   - Exportación/importación y restauración comprobadas; consentimiento y eliminación de datos según funciones realmente activas.
6. **Rendimiento, costes y operación (Etapa 13, transversal).**
   - Medir carga/bundle, consultas y respuestas IA, límites por usuario, cuotas y costes de proveedores.
   - Monitorización sin datos privados, alertas operativas, copias y restauración, recuperación tras sesiones vencidas/reinicios.
   - Pruebas de seguridad, dependencias, migraciones, aislamiento, CI y publicación; comprobar el despliegue servido, no solo un commit.
   - Revalidar WhatsApp con dos usuarios reales y escenarios de voz/cancelar/reintento cuando falte evidencia; no dar por pendiente una función ya comprobada por el propietario.
7. **Cierre de producto.**
   - Recorrido completo real, corrección de bloqueantes, documentación/ayuda y revisión de privacidad; integración develop → main y despliegue coordinado por entrega.
8. **Comercialización (Etapa 14, opcional).**
   - Solo si el propietario la solicita: requisitos de tiendas, soporte, eliminación de cuenta, límites, coste por usuario y precios sustentados. No añadir cobros/suscripciones por defecto.

Fuera del plan activo por decisión del propietario: piloto y autoservicio Gmail (Etapas 4/5), conciliación multicanal (Etapa 6) y entradas externas bancarias/SMS/pagos (Etapa 10). Mantener los apartados históricos como referencia, no como trabajo autorizado vigente. Los recordatorios de la propia app y la captura Android sí permanecen en el plan.

### Rama y siguiente entrega del asistente

Avance posterior: rama publicada y [PR #97](https://github.com/YaxcheItz/gestorfinanzas/pull/97) en borrador hacia develop. Se añade evidencia estructurada para comparación mensual y acceso al historial con fechas/tipo/moneda y alcance propio, también respetado en CSV. El resto de filtros y consultas sigue pendiente. Publicar una rama no implica merge ni despliegue.

Validación de la segunda entrega: 54 pruebas backend y 57 frontend correctas; build Angular y diff-check correctos. Sin escrituras financieras reales. CI remoto y despliegue deben comprobarse aparte.

Primer corte implementado y comprobado localmente: 76 pruebas relacionadas distintas correctas, incluidas consultas HTTP/persistencia H2 con aislamiento y ausencia de escrituras; diff-check correcto. Sin despliegue ni cambios frontend. El alcance y los pendientes están en [ASISTENTE_EVIDENCIAS.md](ASISTENTE_EVIDENCIAS.md).

Nueva rama `mejoras/asistente-evidencias` en `.local/asistente-worktree`, creada desde `origin/develop` comprobado (`211b457`). La rama principal del checkout conserva Gmail sin publicar. Primer corte: comparación mensual sin IA ni escrituras, reutilizando consultas agregadas existentes. Después: filtros completos, evidencia estructurada y enlaces al historial; presupuesto/restantes y categorías con validación de alcance. No anunciar nada como publicado hasta CI/integración/despliegue.

## Histórico: prioridad anterior al omitir conciliación (2026-10-20)

El propietario pide dejar Gmail en su estado actual y continuar con lo demás. Etapas 4/5 aplazadas: funciona la lectura local bajo demanda con revisión manual y un aviso Nu reconocido; Santander solo validado sintéticamente, sin correo real en la ventana. No hubo registro de dinero. El borrador Cloudflare fue desplegado PAUSADO, cola vacía y sin sesión Kaptal importada; no constituye sincronización automática operativa. `gmailReviewOnly` restaurado a true; no activar servicios ni repetir solicitudes OAuth.

Siguiente trabajo: **Etapa 6, conciliación común y aprendizaje**, sección 10. Auditar primero la bandeja/coincidencias ya existentes y realizar una entrega pequeña sobre razones de pendientes, vínculos al movimiento y distinción entre repetición y coincidencia. Crear una rama nueva desde develop actualizado; mantener intacto el trabajo Gmail sin publicar en su rama/worktree. Después continúa Etapa 7, asistente financiero con evidencias.

Fecha: 18 de octubre de 2026. Este documento es un plan solicitado por el propietario; no afirma que las funcionalidades propuestas esten implementadas. Plan versionado de continuidad; no incluye secretos.

## Revision de continuidad (2026-10-20)

Guia operativa detallada: [GMAIL_PILOTO_PASO_A_PASO.md](GMAIL_PILOTO_PASO_A_PASO.md). Siguiente accion del propietario: cliente OAuth Desktop privado y etiqueta/filtros `Kaptal-Bancos`; despues consentimiento local y lectura piloto con revision manual. Sigue sin iniciarse OAuth ni leerse Gmail.

- Se contrasto el resumen del propietario con el diff y los llamadores del parser/colector/envio de Avisos. No se modifico codigo ni se inicio OAuth ni se consulto Gmail o la API financiera real durante esta revision.
- `git fetch origin` confirma `origin/develop = 211b457`; la rama actual `mejoras/gmail-bancario-piloto` parte de esa base y conserva cambios sin commit/push. `origin/main = ed71e36` integra develop mediante #96. WhatsApp/IA/experiencia ya estan en el historial integrado; no rehacer esas etapas ni asumir por ello pruebas reales detalladas o despliegues actuales.
- Pruebas repetidas: 37 en `test_canales.py` y 86 en toda la suite correctas, sin fallos. `compileall`, JSON de ejemplo y `git diff --check` correctos. El fallo previo de concurrencia de sesion Windows no se reprodujo en esta ejecucion; no se considera corregido ni se modifico su codigo.
- Comprobacion privada limitada a metadatos: dos reglas activas con alias configurados, `gmailReviewOnly` booleano true, fecha 2026-10-15; faltan archivos cliente OAuth/credenciales Gmail y etiqueta configurada. No se imprimieron IDs, saldos, terminaciones ni secretos. Esta comprobacion no revalida cuentas remotas ni acredita permiso Gmail concedido.
- No se encontraron fallos bloqueantes en lo revisado para el piloto manual. Tanto Nu como compra Santander usan identidad del mensaje Gmail cuando falta referencia; esto impide reprocesar el mismo correo, pero no demuestra que dos correos distintos sean operaciones distintas. Mantener revision y coincidencias. Ademas del piloto hay soporte generico de transferencias origen/destino y fixtures de otros formatos: no son reglas bancarias activadas ni amplian el alcance autorizado.
- Pendiente: crear cliente OAuth Desktop y etiqueta/filtros exclusivos, indicar su nombre, completar consentimiento local y resolver ID; despues lectura piloto y revision de Avisos, sin autoconfirmacion. Validacion con correos reales y E2E de este piloto aun pendientes. SPEI Santander y otros bancos fuera de alcance. Revisar/publicar los cambios en esta rama cuando corresponda; no se hizo commit/push en esta revision.
- Para otro chat: «Continua el piloto Gmail de Kaptal. Lee AGENTS.md, ESTADO_SESION.md, PLAN_MAESTRO_KAPTAL.md, BANDEJA_AVISOS.md y HERRAMIENTAS_CANALES_2026-10-17.md. Comprueba la rama mejoras/gmail-bancario-piloto y sus cambios sin publicar desde develop 211b457. Solo Nu recibido y compra TDC Santander, revision manual. La revision del 20 de octubre paso 37 pruebas especificas y 86 completas; el fallo intermitente de lock Windows no esta corregido. Faltan cliente OAuth Desktop, etiqueta/filtros y nombre de etiqueta; luego consentimiento y piloto real autorizado. No leas correo antes de eso ni registres dinero sin confirmacion. Conserva autoria exclusiva y actualiza los MD y el texto de continuidad.»


## Seguimiento vigente (19 de octubre de 2026)

El propietario pidio actualizar este MD al terminar cada parte y recibir siempre un texto listo para continuar en otro chat. `AGENTS.md` conserva esa preferencia. Este seguimiento prevalece sobre las referencias historicas que siguen.

| Parte | Estado | Resultado / siguiente paso |
| --- | --- | --- |
| WhatsApp personal alojado | Funciona; confirmado por propietario | Cloudflare activo. PR #84/#85 integrados en develop y main mediante #86. |
| Preparacion de la etapa siguiente | Comprobada | `origin/develop = 7c3e2ad`; rama nueva `mejoras/whatsapp-multiusuario-base`. Receptor personal health/ready 200 durante esta entrega. |
| 1A: identidad y prueba del telefono | Integrada mediante #87; historial | API propia alta/estado/desconexion, desafio unico, HMAC Kapso y migracion V9. 434 pruebas PostgreSQL correctas, incluidas 18 nuevas; 15 pruebas nuevas H2 correctas. Ver `WHATSAPP_MULTIUSUARIO.md`. No emite permisos financieros ni cambia el Worker desplegado. |
| 1B: interfaz y runtime multiusuario | Integrada y desplegada; activa en Cloudflare | PR #87 y #88 integrados en develop y main (#89). Backend en Render con canal habilitado. D1 respaldada y migrada. Worker multiusuario desplegado y activo (`/health` y `/ready` 200). 39 pruebas pasadas. Pendiente prueba con dos personas reales. |
| 2: IA de respaldo | Integrada en `develop` mediante PR #93 | Reglas primero + rescate con AiProvider (`GroqAiProvider` / `GeminiAiProvider`). Validación estricta de cuentas/categorías del usuario, sanitización de Markdown, control de abusos y 10 pruebas unitarias nuevas (57 pruebas de WhatsApp verdes). |
| 3: experiencia y cierre de voz | Integrada en `develop` mediante PR #95 | El propietario confirma que WhatsApp ya funciona. La implementación pasó 60 pruebas backend WhatsApp y 9 pruebas Angular; no se registró desglose de cada escenario real. |
| 4: Gmail bancario personal real | En curso en `mejoras/gmail-bancario-piloto`, desde `origin/develop` `211b457` | Alcance actual: ingreso por transferencia recibida de Nu y compra con TDC Santander, en revisión manual. Las 37 pruebas del parser pasan; `config.example.json` mantiene reglas desactivadas y las dos reglas están habilitadas en la configuración privada. Las 86 pruebas completas pasaron al revisar el 20 de octubre; el error intermitente previo de lock Windows no se considera corregido. Falta OAuth y etiqueta Gmail exclusiva. El abono SPEI Santander queda pendiente; otros bancos y notificaciones móviles después. |
| 5 y posteriores | Pendientes según alcance original | Gmail autoservicio/multiusuario, conciliación, asistente con evidencias, Android y demás etapas de este plan. |

En la Etapa 3 (PR #95), «deshacer» primero presenta el movimiento identificado y solo lo elimina tras «confirmar deshacer» antes de 15 minutos; cancelar o dejar vencer la confirmación no altera el movimiento. La confirmación del audio acepta «confirmar» y exige el código si se usa «confirmar audio <codigo>». El PR está integrado y el propietario confirma que WhatsApp funciona; no se registró aquí el detalle por escenario de las pruebas reales.

### Estado de la Etapa 4: piloto Gmail

Corrección completada el 20 de octubre: extracción HTML inerte con preferencia por texto plano y reprocesado del aviso genérico mediante edición versionada del mismo ID. Validación real Nu: mismo aviso ahora INGRESO con datos y PENDIENTE; segunda lectura sin duplicación; cero movimientos registrados. 88 pruebas Python, compileall y diff-check correctos; Ruff no instalado. Santander cubierto con pruebas sintéticas HTML/texto, todavía sin validación real en la ventana. El colector sigue bajo demanda local; no se instaló ejecución continua ni se hizo commit/push/despliegue. Próximo: revisión del propietario y publicación de la rama.

Diagnóstico del aviso visible confirmado por el propietario: correo Nu solo HTML, autenticación/remitente/asunto válidos; el parser actual solo extrae texto plano y obtiene cuerpo vacío. Próxima parte: extracción HTML segura con pruebas y actualización de la propuesta existente sin duplicarla al reclasificar. Aún no registrar dinero ni afirmar validación real de Santander.

Aclaración: Configuración > Avisos gestiona Web Push; la revisión bancaria está en «Bandeja de avisos» (`/avisos`). Las claves Web Push no son requisito para Gmail. Publicar el colector local en Git sigue pendiente, pero no habilita ni es necesario para abrir la bandeja ya existente.

Acceso a revisión: ruta publicada `https://kaptalgf.vercel.app/avisos` comprobada con HTTP 200 y ruta presente en bundle principal. El colector local envió el aviso a la API de esa app; no se requiere desplegar el colector para abrir la bandeja existente. Pendiente revisión autenticada por el propietario.

Resultado operativo del 20 de octubre: OAuth readonly completado; identidad Gmail y propietario Kaptal comprobados, etiqueta Kaptal-Bancos resuelta en configuración privada. Primera lectura real desde 2026-10-15 entrega un aviso; segunda lectura mantiene el mismo conteo, sin duplicar entradas. Cero movimientos registrados en ambas; revisión manual activa y autoguardado deshabilitado en memoria. Pendiente revisión del propietario, validación real de ambos formatos y publicación de la rama. Un aviso no acredita por sí solo ambos bancos.

Preparación confirmada posteriormente el 20 de octubre: etiqueta y dos filtros creados según el propietario. Nuevo cliente Desktop encontrado en `.local/canales`, estructura validada y archivo renombrado a `google-client.private.json`, excluido de Git. Siguiente: consentimiento OAuth, resolución del ID de etiqueta y lectura piloto con revisión manual; todavía sin ejecutar.

Avance posterior del 20 de octubre: el JSON encontrado en Descargas no pasó la validación Desktop y no se copió ni modificó. Falta crear o localizar el cliente correcto. El propietario confirma etiqueta creada; ambos filtros aún sin confirmar. Siguen pendientes consentimiento, resolución de ID y lectura real con revisión manual.

Actualización del 20 de octubre: el propietario confirma que aún no ha realizado los pasos del navegador. Se proporciona explicación desde cero para Google Cloud, cliente OAuth Desktop, archivo JSON y etiqueta/filtros Gmail. No se ha iniciado consentimiento ni lectura en esta entrega; continúa pendiente la preparación manual y después la prueba real.

El alcance pedido ahora se limita al ingreso por transferencia recibida de Nu y la compra con TDC Santander; ambos se proponen para revisión, no se autoguardan. `config.example.json` contiene las plantillas desactivadas por defecto, y las pruebas sintéticas usan esas mismas reglas. Con autorización del propietario se consultaron las cuentas/listas propias en modo lectura y se configuró el archivo privado con los alias y esas dos reglas activas; no se mostraron IDs ni saldos. No se guardaron correos originales ni se inició OAuth. Aún faltan el cliente OAuth de escritorio, el consentimiento local y crear una etiqueta/filtro exclusivos en Gmail para resolver luego el ID de etiqueta. La fecha inicial solicitada es 2026-10-15. El aviso de abono SPEI Santander sigue pendiente: aunque se compartió el cuerpo, falta su remitente y asunto exactos; no reutilizar para él los metadatos del correo de transferencia saliente. El aviso Nu no trae referencia bancaria, así que la regla usa el ID Gmail para reintentos, manteniendo revisión y deduplicación local por huella. La compra Santander valida los últimos cuatro del correo contra `bankIdentifiers` de la cuenta de tarjeta configurada. Otros bancos y notificaciones móviles quedan para una etapa posterior. La etiqueta y fecha limitan mensajes consultados, no el alcance OAuth. `gmail.readonly` es restringido; Google contempla posibles excepciones para uso personal/desarrollo y requisitos de verificación/assessment según distribución y arquitectura. Revisar el caso antes de publicar.

Fuentes oficiales consultadas: [scopes Gmail](https://developers.google.com/workspace/gmail/api/auth/scopes), [OAuth para aplicaciones de escritorio](https://developers.google.com/identity/protocols/oauth2/native-app) y [verificación de scopes restringidos](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).

No marcar la parte multiusuario completa por haber terminado 1A. No habilitar el nuevo flujo publico hasta conectar UI, Worker y permisos. No volver a configurar ni detener la conexion personal que funciona. Revision oficial del sandbox de Kapso: cada telefono de prueba necesita una sesion activa y su codigo del proveedor; el registro de Kaptal no sustituye esa activacion. Confirmar numero productivo/condiciones antes del alta publica de cualquier usuario.

Evidencia de 1A: `replica/whatsapp-multiusuario-base/verification.json`. Base de datos aislada con migraciones V1-V9; build `mvnw verify` correcto. No se desplego V9 ni se habilito la funcion en produccion. CI remoto: comprobar el PR de la rama, no asumir resultado por las pruebas locales.

## Activación de WhatsApp multiusuario (19 de octubre de 2026)

Integración completada mediante [PR #87](https://github.com/YaxcheItz/gestorfinanzas/pull/87) y [PR #88](https://github.com/YaxcheItz/gestorfinanzas/pull/88) en `develop` y `main` (#89).

- Backend: desplegado en Render con variables `WHATSAPP_CHANNEL_ENABLED=true`, `WHATSAPP_CHANNEL_RUNTIME_ENABLED=true`, `BOT_PHONE=+56920403095`, `PHONE_NUMBER_ID=597907523413541` y secreto verificado; disponibilidad activa comprobada en `/api/canales/whatsapp/disponibilidad` (`data: true`).
- Worker Cloudflare: respaldada base D1 a `.local/canales-cloudflare/d1.pre-multiuser.1792434489673.private.sql`, aplicada migración 0002, desplegado y reanudado en modo multiusuario activo (`paused: false`). `/health` y `/ready` responden `200 OK` (`{"ok": true}`).
- Pruebas: 39 pruebas del Worker pasadas al 100%. `setup.mjs` optimizado con reintentos para conexiones con latencia y uso síncrono de `--command`.
- Rama actual: `mejoras/whatsapp-multiusuario-activacion`, registrada en [PR #90](https://github.com/YaxcheItz/gestorfinanzas/pull/90).
- Siguiente paso: Probar con dos personas reales desde la app (`https://kaptalgf.vercel.app/`), retirar la sesión personal antigua con `setup.mjs retire-personal-session`, y continuar con la Etapa 2 (IA rápida de respaldo).
- Texto para el siguiente chat: «Continua Kaptal desde AGENTS.md, ESTADO_SESION.md y PLAN_MAESTRO_KAPTAL.md. WhatsApp multiusuario ya esta desplegado y activo en Cloudflare Workers con /health y /ready en 200; backend disponible en produccion. Siguiente: probar vinculacion y consulta de dos personas reales (propietario y segunda cuenta) desde la app, luego ejecutar retire-personal-session y continuar con la Etapa 2 (IA de respaldo rapida). Conserva mi autoria exclusiva y actualiza los MD al cerrar cada paso.»

## 1. Objetivo y prioridad del propietario

Convertir Kaptal en una app de finanzas sencilla, bonita y rapida, con registro por texto/voz/automatizaciones y lenguaje visual inspirado en MonAi: blanco/coral, emojis pastel, barras redondeadas, mucho espacio, Inicio dominante y hojas contextuales. Conservar la identidad de Kaptal y su contabilidad.

Prioridad nueva expresa:

1. Cada usuario conecta su propio WhatsApp mediante un boton dentro de Kaptal, verifica su telefono y consulta/registra solo en su cuenta.
2. Reglas/diccionario primero; IA muy rapida solo cuando el motor actual no entiende. Medir rapidez y precision, no elegir por publicidad.
3. Gmail bancario, primero piloto real y despues autoservicio para otros usuarios.
4. Retomar el resto del plan previo, sin perder ni rehacer lo ya integrado.

El usuario pidio el plan completo antes de implementar estas nuevas etapas.

## 2. Estado comprobado al escribir este documento

- Proyecto: C:\Users\yaxti_cm5rg3t\Documents\MI LAP 2\APRENDER\Proyectos\GestionFinanzas.
- Stack a conservar: Angular, Spring Boot, PostgreSQL. Web publicada: https://kaptalgf.vercel.app/.
- WhatsApp PERSONAL funciona: usuario confirmo que responde. Kapso entrega a Cloudflare Workers; D1 conserva cola/contexto/sesion cifrados. El webhook existente ya apunta al Worker, con HTTPS y sesion Kaptal verificados. Receptor Python local detenido; no necesita tunel ni PC encendida.
- Cola original trasladada conservando 10 eventos, UUID y respuestas. No se crearon movimientos reales de prueba por iniciativa del agente. No afirmar que se probaron todas las variantes de audio/gasto reales por una confirmacion general de funcionamiento.
- PR #84 y #85 ya integrados en develop; develop integrado a main mediante PR #86. Fetch comprobado: origin/develop 7c3e2ad; origin/main c077b5e. El checkout local principal estaba en main 0d56d00 y quedo intacto: actualizarlo de forma segura al retomar, sin asumir que ya contiene los merges.
- Worktree de la entrega anterior: .local/whatsapp-cloudflare-worktree, rama mejoras/whatsapp-cloudflare. No reutilizarla para la etapa siguiente ni eliminarla sin comprobar dependencias de rutas privadas.
- Cambios del Worker en tools/whatsapp-worker/. 27 pruebas D1/contratos y E2E con API/PostgreSQL reales correctos; implementacion tuvo 14 checks remotos verdes. Revalidar checks del ultimo commit al retomar si importa para una publicacion.
- Ya hay rediseño, periodos flexibles, listas/etiquetas, busqueda, presupuestos/recurrencias y bandeja Avisos implementados en etapas previas. Auditar alcance y comportamiento antes de agregar; sus documentos viejos mezclan historial y pendientes.
- Ya existe integracion de IA en la app: AiProvider, GroqAiProvider, GeminiAiProvider y AiActionService, entre otros. GroqAiProvider usa por defecto openai/gpt-oss-20b. NO asumir que esta configurado en produccion ni que WhatsApp ya lo llama. El canal de WhatsApp actual interpreta por reglas.
- Gmail tiene preparacion local/OAuth y pruebas sinteticas, pero no una integracion bancaria real cerrada ni autoservicio multiusuario. No existen parsers reales de todos los bancos por haberlos mencionado en conversacion.

## 3. Lecturas y reglas para retomar

Leer AGENTS.md, docs/ESTADO_SESION.md, este archivo y docs/PLAN_CONTINUACION_MONAI.md. Despues: docs/WHATSAPP_CLOUDFLARE.md, WHATSAPP_CUENTAS_CONSULTAS.md, WHATSAPP_VINCULACION_GOOGLE.md, BANDEJA_AVISOS.md, PLAN_UI_MONAI.md y replica/monai-kesef/recon.md cuando corresponda.

Los estados viejos pueden decir que no hay webhook o cuenta Kapso, que se necesita Oracle o que PR #85 sigue abierto: son historicos. Prevalecen comprobacion remota actual y las decisiones posteriores del propietario.

Reglas:

- Espanol. Usar las skills pertinentes sin pedir al usuario elegirlas. No reinstalarlas ni ejecutar todas.
- Cada etapa en una rama nueva desde develop actualizado y comprobado contra origin. No implementar sobre develop/main ni reutilizar ramas anteriores. Un PR por etapa; no mezclar Gmail, IA y Android en un PR enorme.
- Autoria exclusiva YaxcheItz <yaxtibla1@gmail.com>; sin coautores automaticos.
- No perder cambios del usuario, mover datos financieros ni reiniciar servidores personales por rutina. Aislar pruebas en propietarios/esquemas sinteticos.
- Secrets/cookies/tokens/telefonos/identificadores privados estan bajo .local/canales/ y .local/canales-cloudflare/. Leer solo lo necesario; nunca copiarlos a Git, logs publicos o chat.
- No volver a ejecutar connect sin razon: la sesion actual funciona. No compartir cookies entre procesos ni arrancar Python junto al Worker.
- Toda escritura financiera pasa por la API autorizada y sus reglas/contabilidad; nunca escribir saldos con SQL ni permitir a una IA hacerlo.
- Preservar idempotencia, monedas, historial, aislamiento por usuario y recuperacion offline. Ambiguedades/posibles duplicados quedan pendientes.
- Separar desarrollo, CI y activacion real. Revisar autorizacion de despliegue concreta al cambiar produccion; no contratar planes por inferencia.
- Probar el cambio pertinente, documentar resultados reales y actualizar estado. No presentar capturas sinteticas como prueba en Android fisico ni pruebas locales como conexion real con un proveedor.

Skills orientativas, no obligacion de ejecutar todas: canales-personales; ponytail; api-and-interface-design; security-review; angular-developer; source-driven-development; debugging-and-error-recovery; ecc-verification-loop; apple-design/mobile-native/playwright-cli/ui-ux-pro-max para UI cuando toque. Graphify puede ayudar si existe un grafo vigente; un mapa viejo del backend no describe automaticamente Workers ni cambios nuevos. No generar un grafo enorme solo para ahorrar tokens.

## 4. Etapa cero: preparar el siguiente desarrollo

1. Comprobar git status, ramas, worktrees, fetch, PRs/CI y versiones desplegadas. Usar origin/develop como base verificada, con actualizacion segura del checkout elegido.
2. Verificar health/ready del Worker y sesion sin mostrar datos privados. Conservar servicio personal operativo.
3. Revisar codigo actual de vinculacion Google, interpretacion WhatsApp, Avisos y proveedores IA para reutilizarlo.
4. Revisar en Kapso si sigue usando sandbox y que se requiere para atender otros numeros: destinatarios permitidos, pruebas con otro usuario, numero productivo, limites y coste por mensajes. Un sandbox no equivale a servicio publico ilimitado.
5. Crear una matriz corta: hecho, parcial, pendiente, evidencia y siguiente criterio de cierre. Limpiar contradicciones del plan sin borrar el historial.

Cierre: base y alcance comprobados, nueva rama preparada y servicio actual intacto.

## 5. Etapa uno: WhatsApp multiusuario desde la app

Rama sugerida: mejoras/whatsapp-multiusuario. Si el cambio es grande, dividir en entregas secuenciales: contrato/modelo; vinculacion UI; procesamiento y migracion. Integrar cada una antes de crear la siguiente.

### Experiencia del usuario

Configuracion > Integraciones > WhatsApp:

- Estado: no conectado, pendiente, conectado, requiere volver a autorizar, desconectado.
- Boton Conectar WhatsApp.
- Captura/confirmacion de telefono con codigo de pais.
- Consentimiento claro: permitir consultas, registro y preferencias de autoguardado.
- Boton Abrir WhatsApp con mensaje de verificacion prellenado hacia el numero del bot.
- El usuario envia un codigo temporal generado por Kaptal; el webhook firmado comprueba que el remitente coincide con el numero esperado y consume el codigo una sola vez.
- La app confirma vinculado sin terminal ni copia manual de credenciales.
- Opciones: cuenta/lista predeterminada, moneda, autoguardado, consultas permitidas, acceso a voz/IA cuando esten disponibles, cambiar numero y desconectar.
- Indicar que cada usuario usa su propia cuenta financiera aunque todos escriban al mismo numero del bot. No necesita cuenta propia de Kapso para este modelo.

### Backend y seguridad

- Modelar conexion por usuario: identificador, usuario, proveedor/bot, telefono normalizado, estado, preferencias, verificaciones, revocacion y fechas. Definir politica inicial simple de un numero activo por usuario y una asociacion activa por numero; no habilitar duplicados ambiguos.
- Desafio aleatorio, corto en tiempo, de un uso, hash en persistencia, limites de intentos y de emision. No vincular solo porque alguien escribio un numero en un formulario.
- Normalizacion E.164 compatible con remitentes reales del proveedor; no anteponer o retirar digitos mexicanos a ciegas. Probar casos de formato.
- Endpoint autenticado para iniciar/ver estado/desconectar, y flujo del webhook para verificar propiedad. No exponer si un numero ajeno ya esta registrado.
- Resolver identidad solo desde sesion autenticada o evento Kapso verificado. Un userId/cuentaId enviado por cliente o modelo no concede acceso.
- Elegir autorizacion limitada de canal por conexion, revocable y auditable. Reutilizar el flujo Google existente cuando ayude, pero reemplazar el paso de terminal. No convertir la cookie del propietario actual en una credencial para todos.
- Revocar al desconectar/cambiar numero o borrar usuario, limpiar contexto y bloquear pendientes de conexiones revocadas segun politica explicita.
- Persistir eventos/borradores/voz/respuestas por conexion y usuario. Deduplicacion incluye identidad y evento externo. Nunca mezclar contexto de dos remitentes.

### Worker y migracion

- El Worker actual fija un propietario y telefono en variables globales y liga el cifrado a esa identidad. No basta agregar una lista de telefonos permitidos: hay que disenar enrutamiento y autorizacion por conexion.
- Mantener Cloudflare como receptor/cola y Kaptal como autoridad de identidad, permisos e importes. Decidir que mapa minimo queda en D1 y como se valida con el backend.
- Guardar credenciales minimas y cifradas, con separacion por conexion; si se necesita un secreto entre Worker y backend, limitarlo al contrato de canal, sin acceso administrativo general.
- Lease/limites por conexion, para que un usuario con errores no bloquee a todos. Cola durable, reintentos acotados, equidad y control de carga/lecturas D1.
- Migracion versionada de D1: respaldo, conservar UUID y respuestas de la conexion personal, migrar cifrado con compatibilidad o version explicita, validar en copia y tener retorno.
- No usar comandos remotos de importacion masiva de SQL como reemplazo de operaciones concurrentes de la aplicacion activa. El setup de mantenimiento anterior exige pausa.
- Cambios del webhook solo si realmente necesarios: mantener identificador/secretos y evitar receptores/procesadores duplicados.

### Aceptacion

Dos usuarios A/B con numeros y cuentas distintos se vinculan sin terminal, preguntan saldo y registran gastos solo propios. Numero desconocido no accede a finanzas. Codigo vencido/reutilizado/robado, asociacion repetida, revocacion, cambio de numero, reintentos, fallos y reconexion quedan probados. La conexion personal ya activa conserva sus datos y funcionamiento.

## 6. Etapa dos: IA rapida de respaldo

Rama sugerida: mejoras/whatsapp-ia-fallback.

### Flujo deseado

Mensaje > reglas/diccionario/aprendizaje confirmado > si no alcanza, IA > estructura validada por backend > aclaracion o Avisos > registro idempotente cuando corresponda > respuesta.

- Revisar/reutilizar AiProvider, GroqAiProvider, GeminiAiProvider, AiActionService, parsers y servicios de captura actuales. Un motor compartido para web/WhatsApp y, mas adelante, otros canales.
- Diferenciar no entendido, datos faltantes y error de infraestructura. No llamar IA si solo falta elegir cuenta, ni repetir IA para compensar un timeout del backend.
- Evaluar primero Groq con openai/gpt-oss-20b, ya presente, comparado con otros modelos realmente disponibles. No prometer el mas rapido universal: medir tiempo total p50/p95, exactitud de importe/fecha/cuenta, JSON valido, errores y coste por movimiento.
- Pruebas en espanol con faltas, expresiones coloquiales, ayer/antier, monedas, varias operaciones, ingresos, devoluciones y transferencias. Seleccionar modelo por precision minima y menor latencia real; dejarlo configurable.
- Salida estructurada con esquema cerrado. El modelo propone intencion/campos o solicita aclaracion; el backend resuelve IDs contra recursos autorizados y valida importes/fechas/monedas/tipos/listas.
- Nunca inventar cuenta, moneda o importe faltantes. La confianza declarada por el modelo no basta para autoguardar. Politica automatica explicita por usuario, validaciones verificables y confirmacion para casos inciertos.
- IA recibe solo mensaje y catalogo minimo necesario. No enviar historial completo, tokens, OTP, correo bancario bruto o saldos innecesarios. Preferencias y aviso de procesamiento externo.
- Limites por usuario, timeout corto, maximo de salida, circuit breaker y presupuesto global; sin cascada infinita de modelos. Sin IA configurada o si falla, mantener reglas y aclaracion/revision.
- Congelar propuesta/contexto minimo antes del registro. Reintentar confirmacion financiera sin volver a reinterpretar ni gastar IA de nuevo. No reutilizar respuestas entre usuarios.
- Aprendizaje de comercios/categorias/alias a partir de correcciones explicitas, por usuario y reversible. Diccionarios/indices antes de IA recurrente.
- Varias operaciones por mensaje con claves por elemento y manejo claro de exito parcial; no declarar todo guardado si una fallo.

Cierre: reglas siguen funcionando sin proveedor; fallback medido, validado y limitado; prueba de aislamiento e instrucciones maliciosas; coste visible y errores humanos. Consultas/IA no alteran datos por si solas.

Fuentes actuales: https://console.groq.com/docs/models y https://console.groq.com/docs/structured-outputs. Velocidad publicada de tokens no equivale a latencia total de Kaptal.

## 7. Etapa tres: cerrar voz y experiencia WhatsApp

Rama sugerida: mejoras/whatsapp-experiencia.

- Confirmar con pruebas reales el gasto autentico elegido por el propietario, nota de voz, cancelar y posible duplicado; una respuesta general correcta no prueba todo.
- Mantener transcripcion firmada/proveedor autorizado y confirmacion por codigo vigente. Alternativa por texto.
- Si Kapso no proporciona transcripcion suficiente, evaluar servicio de voz rapido y coste, con consentimiento; no descargar URLs arbitrarias recibidas por mensaje.
- Usar botones/listas interactivas si el proveedor/ventana lo permiten: elegir cuenta, confirmar/cancelar, abrir Avisos o movimiento mediante enlaces propios autorizados.
- Mensajes breves: importe, cuenta elegida, guardado/pendiente y alternativa de correccion. No afirmar entrega hasta confirmacion del proveedor.
- Acciones simples de correccion/anulacion requieren identificar operacion y confirmacion; no borrar por una frase ambigua.
- Estado en la app: conexion, ultima actividad, pendientes/error y reconectar. Alertas operativas sin mostrar contenido financiero sensible.

Cierre: dos personas completan flujo real desde sus telefonos; no depende del equipo del desarrollador y los reintentos no duplican dinero/respuestas.

## 8. Etapa cuatro: Gmail bancario personal real

Rama sugerida: mejoras/gmail-bancario-piloto.

- Revisar tools/canales/gmail_auth.py y recolector actual; reutilizar pruebas/contratos, no inventar una nueva contabilidad.
- Para ampliar Gmail a otros bancos o notificaciones móviles, confirmar primero las instituciones, formatos y permisos; el piloto actual solo cubre Nu/Santander y no se ha conectado a Gmail.
- OAuth con Google, acceso minimo necesario, cuenta esperada verificada, desconexion/revocacion. El login Google de Kaptal NO concede acceso a Gmail.
- Explicar alcance de gmail.readonly: una etiqueta o filtro no reduce el permiso OAuth al correo bancario. Verificar requisitos de scopes restringidos y excepciones aplicables antes de distribuir.
- Configurar etiqueta/filtro y fecha inicial para no importar todo el pasado automaticamente.
- Reglas por banco/remitente/plantilla, validacion de autenticidad, referencia, moneda, fecha y cuenta; ignorar enlaces/adjuntos/instrucciones y excluir OTP/promociones.
- Distinguir compra, ingreso, transferencia, devolucion, pago de tarjeta, autorizacion pendiente y cancelacion. Pagar una tarjeta no debe duplicar el gasto de sus compras.
- Cuenta ambigua: pedir mapeo explicito; no adivinar por una cuenta predeterminada incorrecta.
- Reusar Avisos y deduplicacion multicanal. Guardado automatico solo para reglas reconocidas sin ambiguedad ni coincidencias.
- Piloto con vista previa y pruebas de falsos positivos. No prometer IA como prueba de autenticidad bancaria.

Cierre: al menos bancos concretos cubiertos con fixtures representativos y reintentos sin duplicar, revocacion efectiva y registros reales autorizados verificados.

## 9. Etapa cinco: Gmail autoservicio y sincronizacion alojada

Rama sugerida: mejoras/gmail-multiusuario.

- Boton Conectar Gmail por usuario, OAuth propio de correo, estado, bancos/reglas activados, cuentas asociadas, fecha inicial, automatico/revision, pausa y desconexion.
- Tokens cifrados por usuario, sin mezclar buzones. Revisar verificacion de Google y necesidades de evaluacion de seguridad segun scopes, distribucion y arquitectura; no presentarlo como tramite gratuito ya resuelto.
- Elegir procesamiento incremental alojado: Gmail watch + Pub/Sub o polling controlado segun coste/complejidad. Si watch, renovar suscripcion antes de vencer, verificar notificaciones y usar historyId; la notificacion no contiene todos los datos del correo.
- Cursor durable, catch-up, historyId caducado, eventos repetidos/desordenados, refresh revocado, cuotas y trabajos por usuario. No perder avisos durante un reinicio.
- Retencion minima y borrado de conexion. Banco/regla desconocidos quedan pendientes sin autoimportacion.

Cierre: dos buzones aislados, sincronizacion recuperable sin PC y procedimiento de alta/revocacion probado.

Fuentes: https://developers.google.com/workspace/gmail/api/auth/scopes y https://developers.google.com/workspace/gmail/api/guides/push.

## 10. Etapa seis: conciliacion comun y aprendizaje

Rama sugerida: mejoras/conciliacion-canales.

- Una bandeja para manual, WhatsApp, Gmail y despues notificaciones/SMS. Cada evento conserva origen verificado, identificador y vinculo al movimiento.
- Distinguir evento repetido, mismo cargo visto en otro canal y dos compras reales identicas. Confirmar coincidencia cuando no haya evidencia suficiente.
- Mostrar razon del pendiente, propuesta corregible, registrada/descartada y acceso al movimiento. No hacer que un evento tardio guarde una fecha actual incorrecta.
- Ajustar mapeos de banco/comercio/categoria/cuenta por usuario a partir de correccion explicita.
- Edicion y reverso mediante servicios contables existentes; no borrar trazabilidad o cambiar saldos historicos silenciosamente.

Cierre: compra vista por WhatsApp/correo/notificacion termina en un movimiento o revision explicita; ninguna deduplicacion elimina una compra diferente sin confirmacion.

## 11. Etapa siete: asistente financiero con evidencias

Rama sugerida: mejoras/asistente-evidencias.

- Reutilizar chat, consultas WhatsApp y backend actual. Soportar rango/lista/moneda: gasto por categoria, comparacion, presupuesto restante y tendencias sencillas.
- Calculos exactos mediante consultas autorizadas, no calculos inventados por LLM. IA interpreta y explica, sin SQL libre ni acceso a otro usuario.
- Cada respuesta indica periodo, moneda y operaciones consideradas, con enlace a historial filtrado. Comparaciones con periodos equivalentes y tratamiento explicito de datos incompletos.
- Ejemplos: cuanto gaste en restaurantes; comparame con el mes anterior; cuanto queda de transporte; que cargos recurrentes tengo.
- Interfaz de conversacion ligera, bloques compactos de evidencia, sugerencias utiles y estados carga/vacio/error. Evitar otro dashboard lleno de tarjetas.
- Comenzar con consultas de solo lectura; cualquier futura accion requiere propuesta/autorizacion aparte.

Cierre: cifras coinciden con reportes/historial, aislamiento probado y ninguna consulta altera saldos.

## 12. Etapa ocho: auditoria funcional y visual pendiente

Varias ramas pequenas segun hallazgos, no otro rediseño completo sin diagnostico.

- Revisar en Android fisico Inicio simple/detallado, barras, teclado, giro, letra grande, microfono denegado/concedido, volver del fondo, listas largas, importes grandes, temas y privacidad.
- Conservar blanco/coral/emojis/barras, hojas y accion principal clara. No barra inferior de cinco opciones, menu Mas desordenado ni tarjetas para cada dato. Skip link accesible oculto salvo foco, no eliminar accesibilidad para ocultar un bug CSS.
- Verificar periodos flexibles integrados: 14 dias vs quincena, cruces de ano, mes corto, bisiesto, rangos de todo el historial; mismo rango/cifras en Home, historial y reportes.
- Fechas de tarjetas: reglas por tarjeta/estado de cuenta, corte y vencimiento reales; no asumir veinte dias universales ni modificar cargos historicos.
- Listas/etiquetas/busqueda: confirmar alcance real; buscar texto/importe/categoria/tag/lista/fechas, paginacion e indices. Busquedas guardadas solo si aportan valor y no estan hechas.
- Presupuestos: restante, umbrales, exceso, enlace desde categoria, periodo explicitamente mensual cuando corresponda. Revisar avisos sin spam.
- Recurrencias: instancia/futuras/todas, meses cortos, fin/cancelacion y ejecucion idempotente; no reescribir historia.
- Offline: captura y borrador durables, sincronizacion, errores y conflictos; que cada pantalla refleje guardado local, pendiente o sincronizado.

Cierre: recorrido fisico documentado, problemas reales corregidos y regresiones pertinentes verdes. No reimplementar listas/periodos/presupuestos por leer una tabla vieja que los marca futuros.

## 13. Etapa nueve: Android y registro desde el sistema

Rama sugerida: mejoras/android-captura; evaluar Capacitor u otra envoltura compatible antes de reescribir Angular.

- PWA actual primero comprobada; luego app empaquetada con autenticacion, enlaces propios, safe areas, teclado, borradores y offline.
- Quick Settings Tile para Anadir gasto desde la cortina. Separarlo de widget de escritorio, acceso directo y notificacion persistente.
- Permisos solo al usar la funcion; deep link a captura y respeto del bloqueo. Probar instalacion/actualizacion y dispositivo real.
- Notificaciones utiles: presupuesto, vencimiento y recurrencia; preferencias, frecuencia y enlaces a pantalla concreta. No exponer importes bloqueados sin opcion del usuario.
- Widgets de acceso rapido/voz y presupuesto solo cuando los datos/sincronizacion esten estables.

Cierre: agregar gasto desde el acceso del sistema funciona con app cerrada y sin red, y se sincroniza una sola vez.

## 14. Etapa diez: notificaciones bancarias, SMS y pagos

Separar ramas por canal.

- Android NotificationListener con consentimiento explicito y apps permitidas; filtrar en dispositivo y enviar solo datos minimos a Avisos. Probar actualizaciones/repeticiones, acceso revocado, pantalla bloqueada y reinicio.
- SMS: empezar por compartir un mensaje elegido. Lectura automatica solo tras revisar permisos y reglas vigentes de distribucion. Excluir OTP y conversaciones ajenas.
- Google Wallet/Google Pay: investigar APIs oficiales y las notificaciones disponibles; no asumir acceso universal a pagos de otras aplicaciones ni que pagar genere un evento accesible a Kaptal.
- Apple Pay/Atajos: etapa iOS separada, guia y automatizacion realmente soportadas, con prueba de usuario. No simularlo con un switch web ni prometer leer todo pago en iPhone.
- Google Assistant/atajos del sistema: comprobar capacidades vigentes en la plataforma objetivo; ofrecer deep links/acciones compatibles, sin comprometer una integracion no disponible.

Cierre: cada canal justifica su viabilidad, consentimiento y deteccion; sin cargos duplicados entre pago, correo y notificacion. Si una API no permite la funcion, documentar alternativa real.

## 15. Etapa once: compartido, divisas y metas

Revisar lo existente y dividir en entregas.

- Listas compartidas: invitaciones/roles/salida/revocacion, autor de cada movimiento y pruebas de permisos. No toda mejora requiere una nueva lista o modelo.
- Repartos: porcentajes/partes/importes, redondeo exacto y liquidaciones sin contar dos veces el mismo gasto. Concurrencia y permisos al editar.
- Divisas: conservar moneda original, tipo de cambio, fecha/fuente, equivalencia secundaria y saldos por moneda. Cambiar moneda visual no convierte el pasado.
- Metas: aportes/retiros entre saldos propios sin inflar ingresos/gastos; progreso y cancelacion claros.

Cierre: centavos y propiedad de fondos conservados, calculos trazables y ninguna suma engañosa de monedas distintas.

## 16. Etapa doce: onboarding, privacidad y acabado nativo

- Onboarding breve/omitible: registrar por texto/voz, categorias/presupuestos y automatizaciones. No pedir todos los permisos al entrar.
- Biometria nativa cuando exista app, bloqueo al volver del fondo y ocultacion de vistas previas; no presentar CSS como Face ID.
- Haptics y animaciones contenidas con reduced motion; controles de 44 px o mas y alternativas a gestos.
- Accesibilidad: foco, lectores de pantalla, formatos numericos/regionales, contraste, letra grande y privacidad en etiquetas accesibles.
- Widgets/notificaciones con preferencia de mostrar dinero sensible, nunca activada a escondidas.
- Importacion/exportacion CSV/respaldo: ensayar casos reales y restauracion; incluir nuevos datos de integraciones solo mediante contrato de respaldo definido y seguro.

Cierre: app util sin onboarding/voz/IA, accesible y coherente en situaciones reales.

## 17. Etapa trece: rendimiento, costes y operacion

Trabajo transversal desde etapas iniciales; cierre de producto al estabilizar funciones.

- Medir arranque/bundle, consultas p95, interpretacion p95, tasa de acierto de reglas, llamadas/coste IA, cola y errores por canal.
- Indices PostgreSQL/D1, paginacion y consultas acotadas. No cambiar lenguaje porque otro framework se anuncie mas rapido.
- Limites por usuario/canal y presupuesto global de IA; cuotas de Workers/D1/Kapso revisadas. Gratis dentro de cuota no equivale a ilimitado ni garantiza coste cero de proveedores externos.
- Monitorizacion sin cuerpos bancarios, metricas agregadas, alertas de sesion/cola/webhook, respaldos cifrados y restauracion verificada.
- Evaluar hosting Spring/PostgreSQL con necesidades y coste reales. Workers/D1 alojan el canal; Cloudflare Pages puede alojar frontend, pero no sustituye Spring Boot directamente.
- Convex: no migrar sin necesidad demostrada que compense portar permisos/contabilidad/migraciones. OmniRoute y Coucou tampoco se instalan solo por estar en una lista.
- Revisar dependencias y secretos en CI; probar aislamiento, migraciones, restauracion y despliegues/rollback.
- Documentar desarrollo, produccion y recuperacion; publicar artefacto correcto y comprobar la app realmente servida.

Cierre: funcionamiento medido, coste controlado, copia restaurable y mantenimiento entendible.

## 18. Etapa catorce: comercializacion opcional

Solo si el propietario decide distribuir/comercializar: requisitos de tiendas, privacidad/eliminacion de cuenta, soporte, costos por usuario, limites y planes reales. No inventar pantallas de suscripcion, periodos de prueba ni cobros porque la referencia MonAi los tenga.

## 19. Criterio de cierre comun de cada entrega

1. Contrato/alcance y riesgos concretos entendidos.
2. Implementacion funcional con estados vacio/carga/error y sin botones simulados.
3. Pruebas pertinentes de datos, permisos, monedas e idempotencia; CI verde.
4. Migracion/copia/retorno comprobados cuando afecte datos o servicio activo.
5. Revision movil real o del proveedor real cuando la entrega lo requiera, separada de mocks.
6. Documentacion y estado al dia con lo hecho y pendiente; commit/PR con autoria del propietario.
7. Integrar a develop; despues a main con pruebas correctas y despliegue coordinado. No llamar terminado a algo solo por publicar codigo.

## 20. Orden recomendado de PRs inmediatos

0. Auditoria corta de base/alcance actual.
1. Modelo/contrato y verificacion segura de WhatsApp multiusuario.
2. Boton y alta/revocacion completas en la app, Worker multiusuario y migracion del propietario, en uno o varios PRs segun tamaño.
3. Reutilizacion del motor IA y fallback Groq medido/validado.
4. Cierre de experiencia texto/voz con dos usuarios reales.
5. Gmail piloto con bancos reales.
6. Gmail autoservicio y sincronizacion alojada.
7. Conciliacion multicanal y asistente con evidencias.
8. Auditoria pendiente y Android/captura/notificaciones.
9. Compartido/divisas/metas y acabado nativo.
10. Rendimiento/operacion/publicacion; comercializacion solo si se solicita.

No abrir diez ramas a la vez ni implementar todo en el siguiente chat. Empezar por el primer bloque y conservar este orden salvo instruccion del propietario.

## 21. Instruccion lista para el siguiente chat

Continúa Kaptal leyendo AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/ASISTENTE_EVIDENCIAS.md (en el worktree del asistente). Solo WhatsApp como canal externo; Gmail deshabilitado, Worker Gmail pausado y Etapa 6 omitida por decisión expresa. Trabaja el asistente financiero con evidencias en mejoras/asistente-evidencias, worktree .local/asistente-worktree, desde develop remoto comprobado. Conserva intacto el borrador Gmail de la rama principal. Prioriza consultas exactas y de solo lectura, sin mezclar monedas ni usuarios, con periodo/alcance y evidencia. Actualiza los MD y no presentes cambios locales como desplegados.
