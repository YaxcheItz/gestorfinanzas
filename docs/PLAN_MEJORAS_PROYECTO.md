# Mejoras por etapas de Kaptal

Tercera entrega de Etapa 11: metas propias con aportes/retiros por transferencias, cancelacion conservando fondos y respaldo v7; divisas con fuente manual y fecha aplicada en historial/CSV/respaldo. Revisadas liquidaciones y concurrencia existentes. Corregidas expectativas obsoletas del CI (respaldo y migraciones) y actualizado Vitest a 4.1.12; auditoria correcta. Frontend 382, build y cinco E2E distintos correctos; backend verify completo final: 504 ejecutadas, 498 correctas y 6 omitidas, sin fallos/errores. Consultar el resultado remoto actual de PostgreSQL/CI en PR #102 antes de integrar. Detalles en COMPARTIDO_DIVISAS_METAS_ETAPA_11.md. PR #102 sin integrar. Despues sigue Capacitor/APK; Gmail fuera.


Segunda entrega de Etapa 11: reparto de pareja por partes enteras, pesos e importes persistidos, respaldo v6/restauracion compatible con v1-v5 y migracion V11. Verificado: backend 493 correctas y 6 omitidas, frontend 382, build y E2E movil correctos. CI previo del PR #102 verde; nuevo CI/PostgreSQL pendiente de publicar esta ampliacion. Siguen pendientes divisas, metas y revision de liquidaciones; no cerrar Etapa 11. Gmail fuera.


## Prioridad vigente: Etapa 11 (2026-10-21)

Orden autorizado: **11 -> base Android con Capacitor y APK firmado descargable -> 10 sin Gmail -> 12 -> 13 -> revision final**. Etapa 9 completada provisionalmente por el propietario; sus pruebas fisicas pendientes se revisan al final, sin certificarlas ahora. APK directo, sin Play Store; widgets y ajustes rapidos requieren componentes Android. Gmail excluido. Comercializacion opcional.

Rama nueva `mejoras/compartido-divisas-metas` desde `origin/develop` actualizado `6775c1e`. PR #101 fue integrado en develop por el propietario durante el trabajo; rama actualizada con origin/develop `3af6e80`, sin integrar el PR #102. Primera entrega de Etapa 11: cambio de rol editor/lector por el propietario, manteniendo movimientos y saldos. Detalles y pendientes en [COMPARTIDO_DIVISAS_METAS_ETAPA_11.md](COMPARTIDO_DIVISAS_METAS_ETAPA_11.md). Etapa 11 sigue en curso: faltan repartos/partes, trazabilidad de divisas y metas.

Los apartados siguientes son el historial anterior; prevalece este orden.

Seguimiento vigente 2026-10-21: Etapa 8 integrada por el propietario; continuar Etapa 9 en `mejoras/android-captura`, carpeta principal. Ver [entrega PWA y pendientes](ANDROID_CAPTURA_ETAPA_9.md) y el plan maestro. Las pruebas físicas anteriores siguen pendientes; Gmail deshabilitado.

Seguimiento PR: [#101 hacia develop](https://github.com/YaxcheItz/gestorfinanzas/pull/101), borrador de `mejoras/android-captura`. 381 unitarias frontend y tres E2E PWA correctas; CI remoto pendiente. Sin merge ni despliegue. PR #99 ya integrado por el propietario; los apartados siguientes son historia.

Seguimiento 2026-10-21: Etapa 8 preparada para PR a develop por autorización del propietario. 366 frontend, 485 backend correctas/6 omitidas; 22 E2E distintos entre regresión y conjunto final. Ver [informe](AUDITORIA_ETAPA_8.md) y [calendario](TARJETAS_CALENDARIO_MX.md). Android físico/producción autenticada pendientes; Etapa 9 después. Gmail deshabilitado.

Prioridad vigente (2026-10-20): solo WhatsApp como canal externo; Gmail deshabilitado y conciliación (Etapa 6) omitida. Sigue el asistente financiero con evidencias. El orden completo actualizado está al inicio de [PLAN_MAESTRO_KAPTAL.md](PLAN_MAESTRO_KAPTAL.md); las prioridades siguientes de este documento son históricas.

Plan detallado de continuación vigente: [PLAN_CONTINUACION_MONAI.md](PLAN_CONTINUACION_MONAI.md). Incluye dependencias, criterios de aceptación y ramas sugeridas. El cierre visual añade compactación de Inicio y estados de captura; periodos flexibles es la siguiente etapa funcional.

## Corrección visual antes de retomar funciones

La guía detallada del usuario sustituye la dirección visual anterior: blanco/coral, Inicio dominante, emoji, captura natural y hojas contextuales. Plan vigente por pantallas, componentes y aceptación: [PLAN_UI_MONAI.md](PLAN_UI_MONAI.md). Implementación en la misma rama de rediseño como corrección, sin iniciar la etapa siguiente.

Se retiran la barra inferior y la tarjeta de balance principal. Inicio simple muestra gasto, periodo, categorías reales y recientes; la variante detallada añade métricas y presupuestos sin convertir cada dato en una tarjeta. Las funciones actuales siguen accesibles. Validar esta entrega en 4300 antes de retomar captura automática/conciliación; las funciones nuevas de la guía siguen el alcance y orden explícitos del plan.

## Ampliación solicitada: MonAi como referencia principal

La petición más reciente prioriza acercar los flujos y el diseño a MonAi y estudiar Kesef. Véase [inventario, viabilidad y orden de construcción](../replica/monai-kesef/recon.md) y [matriz de diferencias](../replica/monai-kesef/features.csv). Inicio vuelve a mostrar barras verticales; captura queda en cabecera y la navegación inferior tiene cuatro destinos.

Después de integrar el rediseño, preparar captura de avisos y conciliación: parser de un banco, propuestas revisables, deduplicación entre canales y pruebas de pagos/devoluciones. Continuar con contenedor Android y baldosa «Añadir gasto», acceso autorizado a notificaciones bancarias y validación física. Incorporar correo según proveedor y SMS según permisos/distribución. La PWA actual no lee notificaciones de otras aplicaciones ni SMS.

Esto amplía el orden anterior: no presentar etiquetas, listas múltiples, edición de series, metas, reparto flexible ni conexiones bancarias como terminados. Tampoco sustituir los saldos reales por un balance mensual para copiar la apariencia de otra aplicación. Cada etapa nueva mantiene rama propia desde develop actualizado; sin despliegue automático desde esta entrega.

## Prioridad vigente: 14 de octubre de 2026

El usuario aprobó el rediseño integral para su uso personal en Android y pidió implementarlo. Primera entrega en `mejoras/rediseno-integral-android`, desde `develop` actualizado `4fb43a1`: diseño oscuro sobrio, variante clara, simplificación de Inicio, Reportes independientes, captura diferida y reducción del bundle. Informe: [rediseño Android](REDISENO_INTEGRAL_ANDROID.md).

Se conserva el stack y el alojamiento durante esta entrega. Las preferencias existentes y las funciones financieras se preservan. Sin publicación, conexiones bancarias ni instalación de nuevas herramientas.

Después de revisar e integrar esta entrega, el orden funcional acordado es: **tarjetas y previsión → captura automática y conciliación → metas de ahorro → notificaciones fiables → integraciones bancarias/Wallet**. Cada bloque se especificará antes de implementarse, en una rama nueva desde `develop` actualizado. No reutilizar la rama de rediseño para esas etapas.

Los apartados inferiores conservan acuerdos e informes históricos. Su descripción del estado de Git, CI y Render debe comprobarse nuevamente antes de cualquier operación.

Actualizado: 8 de octubre de 2026.

## Acuerdo de trabajo

El usuario autorizó corregir los hallazgos de la revisión general por etapas: terminar una, comprobarla, presentar el resultado para revisión y después continuar con la siguiente. Los cambios locales anteriores se conservan. No se ha autorizado un despliegue en esta tarea.

La primera prioridad de la auditoría se divide en bloques para que sesiones, importes y relaciones entre usuarios puedan revisarse de manera independiente. Cada etapa incluye pruebas de regresión, revisión del cambio y actualización de `docs/ESTADO_SESION.md`.

## Prioridad vigente (8 de octubre de 2026)

Estado comprobado: resguardo e integración en develop/main completados; CI remoto de etapa 6 pasa. Render falló por esquema existente sin historial Flyway. El cierre operativo está en `mejoras/etapa-6-cierre-operativo`: respaldo real restaurado, ajustes de esquema y baseline 2 probados en copia; adopción real, permisos del proveedor y recuperación del despliegue siguen pendientes de autorización. Ver `docs/ETAPA_6_CIERRE_OPERATIVO.md`. Continuar por las prioridades siguientes solamente después de revisar y cerrar este bloque, siempre en una rama nueva.

Este orden sustituye la secuencia anterior como orden de ejecución. Se conservan los números de etapa para enlazar informes y evidencias. Cada bloque se comprueba antes de avanzar. No se autoriza publicar ni modificar datos de producción.

| Prioridad | Trabajo | Resultado esperado |
|---|---|---|
| 1 | Resguardar lo actual en GitHub | Rama `mejoras/etapas-1-5`, revisión de archivos/evidencias, commits con identidad Git del usuario como autor y committer, sin coautoría ni firma del asistente. Subir únicamente esa rama, comprobando previews/despliegues antes del push. |
| 2 | Etapa 6: datos y recuperación | Migraciones formales, pruebas PostgreSQL, respaldo/restauración comprobados, rollback y CI frontend/backend/E2E. Resolver conciliación histórica antes de publicar. |
| 3 | Viabilidad de Wallet y decisión móvil | Definir país, bancos y dispositivos objetivo. Comprobar APIs, permisos, costes y alternativas bancarias. Separar detección de compras de envío de notificaciones. |
| 4 | Seguridad antes de nuevas conexiones | Adelantar puntos críticos de etapa 8: sesiones móviles, suscripciones push por usuario/dispositivo, secretos, límites de abuso, dependencias y privacidad. |
| 5 | Elegir y estabilizar despliegue | Medir memoria JVM, arranque, región, PostgreSQL, procesos de fondo, respaldos y coste total. Staging separado de producción. |
| 6 | Notificaciones por operación | Avisar después del commit de gastos, ingresos, transferencias y operaciones compartidas. Cola persistente, reintentos, deduplicación, preferencias y ocultación de importes. Primero operaciones propias; después fuentes externas disponibles. |
| 7 | Etapa 7: arquitectura, UX y rendimiento | Dividir componentes grandes, reducir bundle, mejorar consultas, paginación, accesibilidad, concurrencia y experiencia móvil. |
| 8 | App móvil, si aporta capacidades necesarias | Evaluar Angular con Capacitor para reutilizar interfaz. Adaptar autenticación, almacenamiento y plugins; probar Android/iPhone físicos. Envolver la web no implica acceso a Wallet. |
| 9 | Integración financiera viable | Implementar fuente comprobada con consentimiento, cuenta asociada, deduplicación y conciliación. Notificar al recibir y registrar evento; demora también depende del proveedor. |
| 10 | Validación y publicación | Probar permisos denegados, teléfono bloqueado, app cerrada, desconexión, eventos repetidos y fallos del proveedor. Publicar con monitorización y rollback tras autorización. |

### Alojamiento: hipótesis del plan, pendiente de mediciones

- Vercel + Render de pago: primera opción a medir, conservando la configuración. Render Free no se elige para procesos continuos de notificaciones. Referencia a verificar al evaluar: https://render.com/docs/free.
- Fly.io: alternativa compatible con Docker/Spring Boot; comprobar disponibilidad de máquinas, parada automática y coste. Referencia: https://docs.fly.io/reference/configuration/.
- Cloudflare: evaluar frontend, proxy y auxiliares. Para Spring Boot revisar Containers y su ciclo de actividad, no asumir ejecución JVM en un Worker convencional. Referencias: https://developers.cloudflare.com/workers/languages/ y https://developers.cloudflare.com/containers/.
- No reescribir el proyecto para cambiar de hosting. Evaluar Capacitor si se necesitan capacidades nativas: https://capacitorjs.com/docs/.

Las referencias y recomendaciones de alojamiento provienen del plan entregado por el usuario; no representan una contratación ni mediciones realizadas. País, bancos, dispositivos, presupuesto y fuente financiera siguen por definir.

## Etapas e informes existentes

| Etapa | Alcance | Estado |
|---|---|---|
| 1 | Sesiones: revocación persistente, renovación atómica, 401 correcto, renovación entre pestañas, fallos temporales y respuestas de cuentas anteriores | Verificada; usuario autorizó continuar |
| 2 | Exactitud financiera: MSI, centavos, vínculo compra/cuotas, ediciones/cancelaciones, día original de recurrencia, reloj y zona horaria | Verificada; usuario autorizó continuar. Conciliación de MSI históricos pendiente |
| 3 | Gastos compartidos: invitación y aceptación, permisos, efectos de desvinculación/borrado y claridad del fondo virtual | Verificada; usuario autorizó continuar |
| 4 | Chat: propuestas persistentes, confirmación idempotente y recuperable, edición de propuestas, reportes calculados por servidor, consentimiento y límites de proveedores | Verificada; usuario autorizó continuar. Límites por proceso; retención y límites distribuidos pendientes |
| 5 | Offline/PWA: captura integrada al chat, confirmación de transacciones IndexedDB, sincronización y actualización que preserve borradores | Implementada y verificada localmente; lista para revisión. SQL aditivo sin ejecutar; pruebas físicas pendientes |
| 6 | Datos y operación: migraciones, PostgreSQL en pruebas, CI frontend/E2E, respaldos verificables, compatibilidad y rollback, monitorización | Implementada para revisión en rama propia. Verificación local PostgreSQL/H2 y recuperación; adopción/conciliación reales y CI remoto pendientes |
| 7 | Arquitectura/UX/rendimiento: componentes grandes, servicios tipados, consultas por lote, exportaciones, paginación, ediciones concurrentes, accesibilidad y claridad del dashboard/configuración | Pendiente |
| 8 | Seguridad complementaria y mantenimiento: CORS por entorno, token de acceso en memoria, cabeceras, límites de abuso, gestión de dispositivos, dependencias frontend/backend y cadena de suministro | Pendiente |

## Integraciones solicitadas

- **Google Wallet y Apple Wallet:** conectar las fuentes disponibles para registrar en Kaptal los movimientos realizados mediante estas billeteras. Solicitud explícita del usuario; pendiente de investigación e implementación después de estabilizar las etapas anteriores.
- Primero verificar en documentación oficial qué datos y eventos permiten consultar sus APIs, los permisos, las restricciones por plataforma/país y si requieren integración bancaria u otro proveedor. No asumir que una API de pases o de pagos entrega el historial de compras de una billetera personal.
- Definir el flujo autorizado: consentimiento, cuentas asociadas, revisión o confirmación del registro, identificación del origen, deduplicación, conciliación y desconexión. Si no hay acceso directo al historial, documentar las alternativas viables y sus límites antes de elegir una.
- Criterio de cierre: movimientos de prueba registrados una sola vez, asignados a la cuenta correcta y sin acceso a datos ajenos. El objetivo solicitado es registrar movimientos, además de cualquier vinculación visual de pases.

Las otras funciones nuevas propuestas (metas de ahorro, previsión de compromisos y conciliación mediante importación) se evalúan después de estabilizar estos bloques. No sustituyen las correcciones pendientes.

## Criterios de cierre

- Reproducir el defecto mediante una prueba relevante cuando corresponda.
- Verificar el comportamiento corregido y las regresiones relacionadas.
- Ejecutar suites y compilación apropiadas al alcance; distinguir resultados locales, pruebas sintéticas y producción.
- Documentar cambios, comprobaciones, advertencias y límites.
- Presentar una etapa concreta para revisión del usuario antes de iniciar la siguiente.

## Continuidad

Informes: [etapa 1](MEJORAS_ETAPA_1_SESIONES.md), [etapa 2](MEJORAS_ETAPA_2_EXACTITUD_FINANCIERA.md), [etapa 3](MEJORAS_ETAPA_3_GASTOS_COMPARTIDOS.md), [etapa 4](MEJORAS_ETAPA_4_CHAT.md) y [etapa 5](MEJORAS_ETAPA_5_OFFLINE_PWA.md). Evidencias en `replica/mejoras-etapa1/` a `replica/mejoras-etapa5/`. El punto de continuidad sigue siendo `docs/ESTADO_SESION.md`. Antes de publicar, conciliar MSI históricos con los importes originales y revisar consentimiento de vínculos activos anteriores. Incorporar UUID de idempotencia para operaciones financieras compartidas con respuestas inciertas en etapa 7. Definir retención de propuestas/resultados en etapa 6 y límite distribuido de proveedores en etapa 8.

Etapas 1–5 integradas por el usuario en develop (`ca59493`, comprobado local/remoto). Etapa 6 implementada en `mejoras/etapa-6-datos-recuperacion`, lista para revisión local; informe [datos y recuperación](MEJORAS_ETAPA_6_DATOS_RECUPERACION.md). Cada etapa tendrá rama distinta basada en develop actualizado. Retención: conservar propuestas/resultados hasta borrar cuenta; no purgar claves que permitan duplicados. Adopción del esquema real, conciliación histórica y ejecución remota de CI siguen pendientes antes de publicar. Siguiente prioridad después de revisar esta entrega: viabilidad Wallet y decisión móvil, en otra rama. No se inició esa investigación ni integración.
