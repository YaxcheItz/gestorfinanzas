# Etapa 3: gastos compartidos

Fecha: 6 de octubre de 2026. Alcance autorizado: corregir y revisar esta etapa antes de continuar con chat.

## Cambios

- Crear un vínculo envía una invitación dentro de la aplicación. No concede acceso financiero ni activa el grupo hasta que acepte el destinatario. El remitente puede cancelar y el destinatario rechazar. No se envían correos externos.
- La invitación conserva el nombre y los correos originales, sin exponer cambios posteriores del perfil mientras está pendiente. Solo el destinatario puede aceptar. Los reintentos de invitación y aceptación no duplican vínculos. Máximo de 20 invitaciones pendientes por participante.
- Bloqueos de usuarios en orden estable, bloqueo del vínculo y versión de entidad protegen aceptaciones, desvinculación y borrado concurrentes. Consultas de IDs evitan comprobar una versión antigua antes de adquirir el bloqueo.
- Ambos miembros pueden registrar movimientos. Solo el autor puede eliminarlos. Los pagos conservan quién los registró, aunque la otra persona sea quien pagó. Pagos históricos sin autor conocido permanecen de solo lectura.
- Desvincular archiva el grupo. Ambos miembros conservan acceso al historial, sin nuevas operaciones. Una invitación posterior crea un grupo nuevo.
- Eliminar una cuenta conserva el historial compartido del miembro restante con una referencia deshabilitada denominada «Cuenta eliminada». Se eliminan el usuario original, sus sesiones y sus datos personales financieros. Se retiran sus datos de contacto de la invitación. Al eliminar ambos miembros se limpia el historial y las referencias huérfanas.
- Respaldos nuevos versión 3 conservan autoría de pagos. Se admiten versiones 1, 2 y 3. Restaurar crea siempre una copia privada e inactiva, con el otro participante tomado del archivo como referencia histórica deshabilitada. Nunca enlaza la copia a una cuenta real ni consulta su perfil actual, aunque el correo exista. El otro participante no puede ver esa copia.
- Se validan importes y repartos: dos decimales y ninguna parte nueva en cero por redondeo. Se preservan participaciones históricas de cero en archivos compatibles.
- La interfaz distingue invitaciones, grupo activo e historial. Confirma aceptación y borrados, oculta acciones ajenas, explica pagos sin autor y bloquea envíos simultáneos. Se corrigieron dirección del pago, indicador de envío tras respuestas síncronas y vista previa del reparto. No se muestra deuda cuando es cero. Controles principales de al menos 44 px.
- El fondo es un registro virtual de aportes y consumo. Estas acciones no transfieren dinero bancario ni revelan movimientos de cuentas personales.

## Validación y evidencias

Las comprobaciones finales y sus resultados exactos se registran en `replica/mejoras-etapa3/verification.json`. Suites completas en `backend-final.log` y `frontend-final.log`; compilación en `frontend-build.log`.

Resultado final: 281 pruebas backend en 39 suites y 198 frontend en 24 archivos, sin fallos. Build Angular de producción correcto, 604.64 kB iniciales frente a presupuesto de 500 kB; CSS del login supera su presupuesto por 1 byte. Los cuatro escenarios Chromium pasan. `git diff --check` sin errores de espacios, permitiendo CRLF.

Se reprodujeron primero seis defectos con pruebas que fallaban antes de la corrección. Las regresiones incluyen consentimiento, permisos, centavos, archivo privado, eliminación de cuentas, pagos sin autor y privacidad de perfiles. Pruebas de concurrencia usan transacciones realmente confirmadas y dos hilos; también se verifican respuestas HTTP 403 y el contenido mínimo de invitaciones.

`browser-pareja.mjs` comprueba dos participantes sobre el build Angular y una API sintética en 360 px claro, 390 px oscuro, escritorio 1280 px y horizontal 844 × 390. Comprueba invitación pendiente, aceptación confirmada/cancelada, permisos de borrado, dirección del pago, archivo de solo lectura, controles táctiles y ausencia de escrituras personales, desbordamientos y errores JavaScript. Capturas y resultados en la misma carpeta.

## Datos y límites

- SQL aditivo de referencia en `docs/sql/ETAPA_3_GASTOS_COMPARTIDOS.sql`, sin ejecutar en PostgreSQL. Se conserva `ddl-auto:update`; migraciones formales corresponden a etapa 6. Frontend y backend deben actualizarse juntos.
- Vínculos activos anteriores siguen activos. No se inventa una fecha de aceptación. Revisar o renovar su consentimiento antes de publicar.
- No se inventa el autor de pagos históricos. Su borrado permanece bloqueado. Los correos de grupos antiguos sin captura de invitación pueden ser nulos.
- El historial compartido conserva conceptos y notas existentes; no hay una eliminación automática de información personal escrita en esos textos. Las copias privadas conservan los datos suministrados por su propietario en el archivo.
- Hay bloqueo de doble envío en UI; las operaciones financieras compartidas todavía no tienen UUID de idempotencia para una respuesta HTTP incierta. Incorporarlo con el trabajo de concurrencia de etapa 7.
- Backend probado con H2; navegador con API sintética, service workers bloqueados y movimiento reducido. No se probaron PostgreSQL real, dispositivos físicos ni producción. No se midió porcentaje de cobertura.
- Persisten advertencias del presupuesto de bundle y CSS del login. No se añadieron dependencias, no hubo commit ni despliegue y se conservaron cambios locales previos.

Punto de revisión: etapa 3. La etapa 4 de chat comienza tras la revisión y continuación del usuario.
