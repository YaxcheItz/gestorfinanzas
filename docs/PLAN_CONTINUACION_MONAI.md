# Plan de continuación de Kaptal

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
