# Plan de continuación de Kaptal

## Integración vigente (2026-10-22)

El propietario autorizó integrar #102/#103 y preparar todo lo posible sin teléfono. PR #102 integrado a develop mediante c8651d03de549b4f31a6c876dc825cf1d8f27edb. Rama Android actualizada con ese develop; conflictos limitados a cinco documentos, conservando los bloques históricos de ambas entregas. Sin despliegue a producción ni cambios en main.

Preparación de APK 0.1.1/código 2 con metas, divisas y compartido. Pruebas del conjunto y resultado de #103 se documentarán al cierre. Los resultados anteriores de CI no sustituyen estas comprobaciones.

Orden: integración → APK actualizada → validación física de sesión, operaciones y offline → Etapa 10 sin Gmail → 12 → 13 → revisión final. Etapa 9 completa provisionalmente; conserva sus pendientes físicos. Gmail deshabilitado y Etapa 6 omitida. Etapa 10 incluye compartir avisos/SMS seleccionados, notificaciones bancarias consentidas y estudio de Wallet/accesos; no supone lectura universal de SMS ni pagos Wallet.

Teléfono no disponible por decisión del propietario. No declarar login, renovación, segundo plano, operaciones, actualización u offline comprobados en Android físico. Sin movimientos financieros reales. Conservar firma privada y APK 0.1.0; instalar posteriormente como actualización con cuenta de prueba autorizada. Google nativo, voz/archivos Android, widgets y accesos nativos continúan pendientes.

Este apartado prevalece sobre los históricos siguientes.




### Historico Android

## Avance vigente: base Android (2026-10-22)

Validaci?n Android: APK release 0.1.0 firmada e instalada, copia en Descargas/Kaptal-0.1.0.apk y .local/releases/kaptal-release.apk. Prueba instrumentada f?sica correcta en SM-A546E/Android 16: arranque local y health HTTPS, sin cuentas ni dinero reales. Frontend 382 y build/auditor?a correctos. PR #103 abierto hacia develop; CI del cierre pendiente de consultar. Sesi?n larga y capacidades nativas avanzadas siguen pendientes.

Rama `mejoras/android-apk` creada desde `origin/develop` revalidado `3af6e80`. Etapa 11 implementada en PR #102, abierto y sin integrar; CI final verde, ejecuci?n 39731697875. Esta rama Android no incluye ese PR todav?a. Etapa 9 completada provisionalmente por decisi?n del propietario; conservar sus pendientes manuales para la revisi?n final.

Orden: 11 ? Capacitor/APK firmado descargable sin Play Store ? 10 sin Gmail ? 12 ? 13 ? revisi?n final. Base Capacitor 8.5.3 con Angular empaquetado, API HTTPS por transporte nativo, sin service worker Android ni GIS web en WebView. Firma local privada, script de build y CI debug. Gmail permanece fuera.

Ver alcance, comprobaciones y pendientes actuales en [ANDROID_APK_BASE.md](ANDROID_APK_BASE.md). No declarar widgets, SMS, notificaciones nativas, exportaciones, Google nativo o sesi?n larga terminados con esta base. Backend sin cambios. Sin merge ni despliegue de producci?n; prevalece este apartado sobre el historial siguiente.

### Historico Etapa 11

Correccion final del E2E remoto: esperar la respuesta HTTP del retiro antes de consultar saldos; tres repeticiones locales correctas. CI 275: cinco jobs verdes, unico fallo por esa espera en la prueba de metas. Revalidar el nuevo CI del PR #102. Comunicacion breve con Ponytail/Caveman; Graphify instalada sin grafo preparado, no se ejecuto; no se encontro una skill llamada agent-skills.


Tercera entrega de Etapa 11: metas propias con aportes/retiros por transferencias, cancelacion conservando fondos y respaldo v7; divisas con fuente manual y fecha aplicada en historial/CSV/respaldo. Revisadas liquidaciones y concurrencia existentes. Corregidas expectativas obsoletas del CI (respaldo y migraciones) y actualizado Vitest a 4.1.12; auditoria correcta. Frontend 382, build y cinco E2E distintos correctos; backend verify completo final: 509 ejecutadas, 503 correctas y 6 omitidas, sin fallos/errores. Consultar el resultado remoto actual de PostgreSQL/CI en PR #102 antes de integrar. Detalles en COMPARTIDO_DIVISAS_METAS_ETAPA_11.md. PR #102 sin integrar. Despues sigue Capacitor/APK; Gmail fuera.


Historico de la segunda entrega de Etapa 11: reparto de pareja por partes enteras, pesos e importes persistidos, respaldo v6/restauracion compatible con v1-v5 y migracion V11. Verificado: backend 493 correctas y 6 omitidas, frontend 382, build y E2E movil correctos. CI previo del PR #102 verde; nuevo CI/PostgreSQL pendiente de publicar esta ampliacion. Siguen pendientes divisas, metas y revision de liquidaciones; no cerrar Etapa 11. Gmail fuera.


## Prioridad vigente: Etapa 11 (2026-10-21)

Orden autorizado: **11 -> base Android con Capacitor y APK firmado descargable -> 10 sin Gmail -> 12 -> 13 -> revision final**. Etapa 9 completada provisionalmente por el propietario; sus pruebas fisicas pendientes se revisan al final, sin certificarlas ahora. APK directo, sin Play Store; widgets y ajustes rapidos requieren componentes Android. Gmail excluido. Comercializacion opcional.

Rama nueva `mejoras/compartido-divisas-metas` desde `origin/develop` actualizado `6775c1e`. PR #101 fue integrado en develop por el propietario durante el trabajo; rama actualizada con origin/develop `3af6e80`, sin integrar el PR #102. Primera entrega de Etapa 11: cambio de rol editor/lector por el propietario, manteniendo movimientos y saldos. Detalles y pendientes en [COMPARTIDO_DIVISAS_METAS_ETAPA_11.md](COMPARTIDO_DIVISAS_METAS_ETAPA_11.md). Los bloques de roles, partes, metas y divisas estan implementados. Revisar el CI actual y el PR #102 antes del cierre y de continuar con Capacitor/APK.

Los apartados siguientes son el historial anterior; prevalece este orden.

Seguimiento vigente 2026-10-21: Etapa 8 integrada por el propietario; continuar Etapa 9 en `mejoras/android-captura`, carpeta principal. Ver [entrega PWA y pendientes](ANDROID_CAPTURA_ETAPA_9.md) y el plan maestro. Las pruebas físicas anteriores siguen pendientes; Gmail deshabilitado.

Seguimiento PR: [#101 hacia develop](https://github.com/YaxcheItz/gestorfinanzas/pull/101), borrador de `mejoras/android-captura`. 381 unitarias frontend y tres E2E PWA correctas; CI remoto pendiente. Sin merge ni despliegue. PR #99 ya integrado por el propietario; los apartados siguientes son historia.

Seguimiento 2026-10-21: Etapa 8 preparada para PR a develop por autorización del propietario. 366 frontend, 485 backend correctas/6 omitidas; 22 E2E distintos entre regresión y conjunto final. Ver [informe](AUDITORIA_ETAPA_8.md) y [calendario](TARJETAS_CALENDARIO_MX.md). Android físico/producción autenticada pendientes; Etapa 9 después. Gmail deshabilitado.

Prioridad vigente (2026-10-20): solo WhatsApp como canal externo; Gmail deshabilitado y conciliación (Etapa 6) omitida. Sigue el asistente financiero con evidencias. El orden completo actualizado está al inicio de [PLAN_MAESTRO_KAPTAL.md](PLAN_MAESTRO_KAPTAL.md); las prioridades siguientes de este documento son históricas.

Actualizacion vigente 2026-10-19: el plan completo y su seguimiento estan en [PLAN_MAESTRO_KAPTAL.md](PLAN_MAESTRO_KAPTAL.md). WhatsApp personal ya funciona en Cloudflare; el propietario adelanto WhatsApp multiusuario desde la app y despues IA de respaldo, antes de Gmail y el asistente avanzado. La primera entrega es contrato/modelo/verificacion del telefono (`WHATSAPP_MULTIUSUARIO.md`); UI/runtime/migracion son la siguiente parte. Las referencias posteriores a WhatsApp sin activar, Oracle o entrega #85 pendiente son historicas.

Complementa `PLAN_UI_MONAI.md` y `replica/monai-kesef/recon.md`. Es la secuencia para retomar el proyecto sin repetir lo implementado. El estado vigente al inicio de `ESTADO_SESION.md` prevalece sobre resultados históricos. No confundir una pantalla diseñada con una integración operativa.

Prioridad vigente (2026-10-18): cerrar WhatsApp antes de Gmail por peticion del propietario. Voz confirmada, recuperacion y alojamiento portable en `mejoras/whatsapp-cierre-operativo`; preferencia de hosting gratuito, ver `WHATSAPP_ALOJAMIENTO_GRATUITO.md`. No marcar cerrado hasta prueba personal y receptor persistente remoto comprobados.

## Reglas para todas las etapas

Actualizacion de hosting: Oracle no permitio el registro; se prepara el receptor personal en Workers + D1 dentro de `mejoras/whatsapp-cloudflare`. Seguir `WHATSAPP_CLOUDFLARE.md`: desplegar pausado, autorizar Google con sesion propia, trasladar cola sin duplicar, cambiar el webhook existente y validar WhatsApp real antes de Gmail. No cambiar Angular/Spring/PostgreSQL por este alojamiento del canal.

Vinculacion Google: el propietario entra con Google, por lo que el puente debe abrir Kaptal y usar consentimiento/codigo de un solo uso, no pedirle una contrasena. Etapa `mejoras/whatsapp-vinculacion-google`, dependiente del PR #80. Ver `WHATSAPP_VINCULACION_GOOGLE.md`. Publicar frontend y backend antes de la prueba personal; despues siguen webhook HTTPS, sandbox, Gmail y asistente con evidencias.

Ampliacion vigente: `mejoras/whatsapp-cuentas-consultas` depende del PR #78. Anade consultas deterministas y registro con todas las cuentas del propietario; ver `WHATSAPP_CUENTAS_CONSULTAS.md`. No marca completada la etapa 4 de asistente avanzado ni la activacion del proveedor: siguen pendientes publicacion del backend, login y prueba HTTPS real.

Actualizacion WhatsApp: PR #76 integrado en `a31d95e`. Preparacion del canal en `mejoras/whatsapp-kapso`; el usuario aun no tiene cuenta Kapso. Ver `WHATSAPP_KAPSO.md`: completar cuenta/proyecto/numero y prueba real antes de marcar conectado. La bandeja ya esta integrada; las siguientes referencias a entrega sin publicar corresponden al historial.

Prioridad actual (2026-10-17): se adelanto la etapa 5 por peticion del usuario. La bandeja esta implementada en `mejoras/captura-avisos`, aun sin publicar. Secuencia siguiente: integrar bandeja → WhatsApp/Kapso real → Gmail bancario con reglas verificadas → etapa 4, asistente con evidencias → etapas 6 en adelante. No se descarta el plan anterior: se cambia el orden para dar soporte seguro a los canales primero. Consultar `BANDEJA_AVISOS.md` y `ESTADO_SESION.md`.

- Conservar Angular, Spring Boot y PostgreSQL mientras las mediciones no justifiquen cambios. No migrar a otra base, lenguaje u hospedaje por apariencia.
- Cada etapa nueva empieza en una rama distinta desde develop actualizado y comprobado contra remoto. El rediseño ya se integró en develop; la entrega funcional integrada es presupuestos y recurrencias; su cierre correctivo se documenta en `CIERRE_PRESUPUESTOS_RECURRENCIAS.md`. Integrar cada entrega antes de basar otra etapa en ella.
- Mantener confirmación, idempotencia, separación de monedas, privacidad, aislamiento por usuario y cola offline. No sobrescribir preferencias ni borrar datos para arreglar vistas.
- Entregar cambios funcionales, migraciones cuando correspondan, pruebas pertinentes, capturas y actualización del estado. No añadir botones simulados ni planes de pago ficticios.
- Las conexiones privadas necesitan configuración y consentimiento del propietario. Nada de leer correos reales, publicar o modificar producción por inferencia de este plan.

## 0. Cierre visual y captura

Continuar en la rama de rediseño. Fundamentos blanco/coral y oscuro, Inicio simple/detallado, emoji, categorías de gasto real, paneles y navegación contextual ya implementados. Añadidos en el cierre: resumen compacto al salir el importe del área visible, cabecera persistente, gráfico reducido y estados de escucha/transcripción/procesamiento. La onda usa niveles reales de audio y queda dentro de captura.

Pendiente físico: abrir en Android real, probar teclado normal/decimal, giro, permiso de micrófono denegado/concedido, grabar/cancelar, volver del fondo y capturar offline. Revisar filas con textos largos y tamaños de letra grandes. Registrar dispositivo, navegador y problemas observados. Ajustar captura, categorías, presupuestos, recurrentes y ajustes según ese recorrido. Cerrar cuando no haya solapamientos ni acciones ocultas y el gasto/periodo/captura se entiendan rápidamente.

## 1. Periodos flexibles

Entrega implementada en `mejoras/periodos-flexibles`, desde develop comprobado. Detalles, contratos y validación: `PERIODOS_FLEXIBLES.md`. Integrado en develop antes de iniciar la etapa 2; el recorrido físico sigue pendiente.

Definir por usuario un periodo predeterminado y una consulta temporal independiente: semana, bloques de 14 días, quincena con días elegidos, mes con inicio elegido, año, todo el historial y rango libre. Anclar los ciclos a una fecha; «cada 14 días» y «quincenal» son distintos. Especificar zona horaria, límites inclusivos, meses cortos, 29 de febrero y comportamiento de días 29–31. No imponer al corte y pago de tarjetas una separación universal de veinte días.

Backend: resolver rangos de forma común y aplicarlos a resumen, categorías, comparaciones e historial. Frontend: hoja de periodo, anterior/siguiente y preferencia persistida. Los presupuestos mensuales siguen etiquetados como mensuales hasta definir otra periodicidad. Aceptación: mismas cifras para el mismo rango en todas las pantallas, cambios de año correctos y tests de límites/calendario. Si se corrigen fechas de tarjeta, conservar fecha real de cada estado de cuenta y vencimiento, sin alterar cargos históricos.

## 2. Listas, etiquetas y búsqueda

Integrado mediante PR #68 desde `mejoras/listas-etiquetas`. Implementación y contratos en `LISTAS_ETIQUETAS.md`; resultados de verificación vigentes en `ESTADO_SESION.md`.

Diseñar lista, miembros, rol y etiquetas. Migrar movimientos actuales a una lista Personal sin cambiar importes, cuentas o propietarios. Crear/editar/archivar listas, elegir lista activa y moneda base, y compartir sólo con autorización. Cambiar moneda de presentación no convierte operaciones anteriores.

Persistir tags por movimiento y añadir filtros por texto, importe, categoría, tags, persona, lista y fechas. Usar índices y paginación; resultados estables al escribir. Aceptación: ningún acceso cruzado entre usuarios/listas, búsqueda en todo el historial y migración ensayada con respaldo. Guardar búsquedas se añade después de estabilizar filtros.

## 3. Presupuestos y recurrencias

Integrado mediante PR #71 desde `mejoras/presupuestos-recurrencias`. Cierre correctivo en `correcciones/presupuestos-recurrencias`; ver `CIERRE_PRESUPUESTOS_RECURRENCIAS.md`.

Mostrar restante al elegir categoría, detalle del presupuesto y umbrales de aviso configurables. Definir edición de una instancia, futuras o toda la serie; cancelación, fecha final, meses cortos y reintentos sin duplicación. No modificar historia silenciosamente. Mantener la confirmación actual hasta especificar un modo automático explícito. Aceptación: sumas verificables, exceso legible sin depender del color y ninguna alerta repetida por reintento.

## 4. Consultas financieras del asistente

Rama sugerida: `mejoras/asistente-evidencias`.

Reutilizar captura natural, reglas, propuestas y chat existentes. Añadir consultas por periodo/lista/moneda: gasto por categoría, comparación y presupuesto disponible. Calcular cifras mediante consultas autorizadas; IA para interpretar y explicar. Cada respuesta incluye rango, moneda, cantidad de operaciones y acceso al historial filtrado. La interfaz distingue consulta de propuesta de escritura. Aceptación: las cifras coinciden con reportes/historial, errores no inventan respuestas y ninguna consulta modifica saldos.

## 5. Bandeja común de avisos y conciliación

Implementada en `mejoras/captura-avisos`; contratos y limites en `BANDEJA_AVISOS.md`. La UI y API ya reciben propuestas estructuradas y permiten revision. Los canales reales, las reglas bancarias y la administracion multiusuario de credenciales siguen pendientes. No confundir el origen indicado por el cliente con una prueba de autenticidad del banco.

Rama sugerida: `mejoras/captura-avisos`.

Pedir bancos, canales y ejemplos anonimizados. Comenzar con pegar/compartir un aviso seleccionado. Modelar fuente autorizada, evento, huella, estado y vínculo con la propuesta existente. Reglas por banco primero; IA opcional si hay ambigüedad. Separar compra, ingreso, transferencia, devolución, pago de tarjeta y autorización pendiente.

Deduplicar identificadores y cruzar canales sin asumir que dos compras iguales son duplicadas. Revisar, corregir, descartar y confirmar; los eventos no confirmados no afectan saldos. Aceptación: avisos repetidos, dos compras idénticas reales, datos incompletos, devolución y reintento offline. No registrar OTP ni texto ajeno en logs o contexto de IA.

## 6. Aplicación Android y captura desde la cortina

Rama sugerida: `mejoras/android-captura`.

Evaluar un contenedor nativo que conserve Angular y el backend, y justificarlo frente a reescritura. Construir acceso «Añadir gasto» en ajustes rápidos; no confundirlo con widget de escritorio o notificación permanente. Abrir captura autenticada, respetar bloqueo y conservar borrador offline. Añadir permisos sólo al usar cada función. Probar en dispositivo real; no presentar emulación como prueba física.

## 7. Notificaciones bancarias

Rama sugerida: `mejoras/android-avisos-bancarios`.

Servicio nativo con acceso explícito a notificaciones y lista permitida de aplicaciones. Filtrar en el dispositivo antes de transmitir. Enviar eventos a la bandeja común. Probar aviso actualizado/repetido, acceso revocado, teléfono bloqueado, app cerrada y falta de red. Aceptación: exclusión de aplicaciones no elegidas, desconexión efectiva y ausencia de cargos duplicados. Autoconfirmar sólo con reglas configuradas y trazabilidad/reversión.

## 8. Correo, SMS y WhatsApp

Separar ramas por proveedor/canal; reutilizar la bandeja, no tres motores contables.

- Correo: elegir Gmail/Outlook u otro proveedor; remitentes permitidos, OAuth, cursor incremental, renovación/revocación y retención mínima. Comprobar requisitos vigentes de permisos/verificación antes de desplegar. Un filtro no limita por sí mismo el alcance OAuth.
- SMS: compartir un mensaje como alternativa inicial. Lectura automática requiere módulo/permisos nativos y revisar condiciones de distribución. Filtrar mensajes financieros localmente y excluir OTP.
- WhatsApp: comprobar el flujo existente, conectar recepción real de texto/audio y asociar identidad/lista/cuenta; validar firma de eventos y reintentos.

Aceptación común: consentimiento, desconexión, recuperación de eventos y deduplicación con captura manual/notificaciones. No confundir avisos salientes con registro entrante.

## 9. Metas, compartido y divisas

Etapas separadas: metas con aportes/retiros sin inflar ingresos; grupos y reparto por porcentajes/partes/importes con redondeo exacto; liquidaciones que no dupliquen gastos; conversión con moneda original, tasa, fecha, proveedor y equivalencia. No sumar monedas distintas ni convertir historia al cambiar una preferencia. Aceptación: centavos conservados y trazabilidad de cada cálculo.

## 10. Experiencia nativa y onboarding

Tras estabilizar datos y flujos: widgets de voz/presupuesto, deep links a detalles, avisos útiles, bloqueo biométrico, protección al volver del fondo y haptics cuando la plataforma lo permita. Onboarding breve y omitible para usuarios existentes; permisos a demanda. Autoguardado de voz sólo opt-in, con estados, corrección/reversión e idempotencia. No exponer dinero sensible en widgets/pantalla bloqueada sin preferencia expresa.

## 11. Rendimiento y publicación

Medir arranque, navegación, consultas, gasto de IA, bundle y comportamiento en teléfono antes de cambiar tecnología. Verificar índices y reglas/diccionario antes de ampliar uso de IA. Evaluar hosting con las necesidades reales del backend; no mezclar esta decisión con la revisión visual.

Antes de publicar: revisar el estado histórico de Render/Flyway, probar migraciones y restauración en copia, completar CI, validar sesión/privacidad, configurar secretos del entorno y comprobar el artefacto servido realmente. Publicación y cambios de producción requieren su autorización concreta; desarrollar no implica desplegar.

## Forma de retomar con poco contexto

Leer `AGENTS.md`, `ESTADO_SESION.md`, este plan y el informe de la etapa que toque. Comprobar Git, develop/remoto y servidores actuales. No volver a instalar skills ni rehacer funciones ya presentes. Trabajar una etapa, comprobarla, documentar resultados y límites, y dejar un punto de continuación claro. El siguiente trabajo funcional es el asistente con evidencias, después de integrar el cierre correctivo de presupuestos y recurrencias.
