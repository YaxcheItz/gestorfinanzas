# Mejoras por etapas de Kaptal

Actualizado: 8 de octubre de 2026.

## Acuerdo de trabajo

El usuario autorizó corregir los hallazgos de la revisión general por etapas: terminar una, comprobarla, presentar el resultado para revisión y después continuar con la siguiente. Los cambios locales anteriores se conservan. No se ha autorizado un despliegue en esta tarea.

La primera prioridad de la auditoría se divide en bloques para que sesiones, importes y relaciones entre usuarios puedan revisarse de manera independiente. Cada etapa incluye pruebas de regresión, revisión del cambio y actualización de `docs/ESTADO_SESION.md`.

## Prioridad vigente (8 de octubre de 2026)

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
