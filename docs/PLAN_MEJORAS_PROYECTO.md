# Mejoras por etapas de Kaptal

Actualizado: 6 de octubre de 2026.

## Acuerdo de trabajo

El usuario autorizó corregir los hallazgos de la revisión general por etapas: terminar una, comprobarla, presentar el resultado para revisión y después continuar con la siguiente. Los cambios locales anteriores se conservan. No se ha autorizado un despliegue en esta tarea.

La primera prioridad de la auditoría se divide en bloques para que sesiones, importes y relaciones entre usuarios puedan revisarse de manera independiente. Cada etapa incluye pruebas de regresión, revisión del cambio y actualización de `docs/ESTADO_SESION.md`.

## Orden y alcance

| Etapa | Alcance | Estado |
|---|---|---|
| 1 | Sesiones: revocación persistente, renovación atómica, 401 correcto, renovación entre pestañas, fallos temporales y respuestas de cuentas anteriores | Verificada; usuario autorizó continuar |
| 2 | Exactitud financiera: MSI, centavos, vínculo compra/cuotas, ediciones/cancelaciones, día original de recurrencia, reloj y zona horaria | Verificada; usuario autorizó continuar. Conciliación de MSI históricos pendiente |
| 3 | Gastos compartidos: invitación y aceptación, permisos, efectos de desvinculación/borrado y claridad del fondo virtual | Implementada; comprobaciones finales en replica/mejoras-etapa3/verification.json. Lista para revisión |
| 4 | Chat: propuestas persistentes, confirmación idempotente y recuperable, edición de propuestas, reportes calculados por servidor, consentimiento y límites de proveedores | Pendiente |
| 5 | Offline/PWA: captura integrada al chat, confirmación de transacciones IndexedDB, sincronización y actualización que preserve borradores | Pendiente |
| 6 | Datos y operación: migraciones, PostgreSQL en pruebas, CI frontend/E2E, respaldos verificables, compatibilidad y rollback, monitorización | Pendiente |
| 7 | Arquitectura/UX/rendimiento: componentes grandes, servicios tipados, consultas por lote, exportaciones, paginación, ediciones concurrentes, accesibilidad y claridad del dashboard/configuración | Pendiente |
| 8 | Seguridad complementaria y mantenimiento: CORS por entorno, token de acceso en memoria, cabeceras, límites de abuso, gestión de dispositivos, dependencias frontend/backend y cadena de suministro | Pendiente |

Las funciones nuevas propuestas (metas de ahorro, previsión de compromisos y conciliación mediante importación) se evalúan después de estabilizar estos bloques. No sustituyen las correcciones pendientes.

## Criterios de cierre

- Reproducir el defecto mediante una prueba relevante cuando corresponda.
- Verificar el comportamiento corregido y las regresiones relacionadas.
- Ejecutar suites y compilación apropiadas al alcance; distinguir resultados locales, pruebas sintéticas y producción.
- Documentar cambios, comprobaciones, advertencias y límites.
- Presentar una etapa concreta para revisión del usuario antes de iniciar la siguiente.

## Continuidad

Informes: [etapa 1](MEJORAS_ETAPA_1_SESIONES.md), [etapa 2](MEJORAS_ETAPA_2_EXACTITUD_FINANCIERA.md) y [etapa 3](MEJORAS_ETAPA_3_GASTOS_COMPARTIDOS.md). Evidencias en `replica/mejoras-etapa1/`, `replica/mejoras-etapa2/` y `replica/mejoras-etapa3/`. El punto de continuidad sigue siendo `docs/ESTADO_SESION.md`. Antes de publicar, conciliar MSI históricos con los importes originales y revisar consentimiento de vínculos activos anteriores. Incorporar UUID de idempotencia para operaciones financieras compartidas con respuestas inciertas en etapa 7. La siguiente etapa es chat; empieza tras revisión y continuación del usuario.
