# Bandeja común de avisos

Etapa en `mejoras/captura-avisos`, desde `develop == origin/develop == ce7bcfb` comprobado mediante fetch. Integra la bandeja con Angular/Spring/PostgreSQL; no conecta ni autentica proveedores externos por sí sola.

## Contrato financiero

- Estados: PENDIENTE, REGISTRADO y DESCARTADO. Recibir, corregir o descartar no modifica saldos.
- Sólo confirmar registra mediante `TransaccionService`, conservando permisos, moneda, listas, cashback, auditoría y libro diario. El aviso y su resultado se confirman en la misma transacción de base de datos.
- La confirmación usa una clave UUID permanente; repetirla devuelve el mismo resultado. Un aviso registrado no se edita ni se descarta: los cambios financieros posteriores se hacen en el movimiento correspondiente.
- Un identificador externo repetido devuelve el aviso existente. Cambiar su contenido reutilizando ese identificador se rechaza. Se conserva la huella incluso al descartar, sin almacenar el identificador original del proveedor.
- Compras → gasto; ingresos/devoluciones → ingreso; transferencias/pagos de tarjeta → transferencia. El pago de tarjeta requiere una cuenta de crédito como destino. Autorizaciones y avisos sin clasificar no se confirman hasta revisarlos.
- La cuenta y moneda deben coincidir; no hay conversión implícita. Para transferencias entre monedas, la API financiera existente exige su tipo de cambio. No se generan recurrencias ni MSI desde un aviso.
- Las coincidencias buscan movimientos propios con la misma cuenta, tipo, fecha e importe, independientemente del canal. Son **posibles** duplicados: requieren una decisión explícita para guardar otra operación. No se descartan automáticamente dos compras iguales. La comparación se repite al confirmar, no sólo al cargar la pantalla.

## API

Todas las rutas requieren sesión del usuario y siempre filtran por propietario. Las modificaciones bloquean primero el usuario y después el aviso; las revisiones comprueban versión para evitar sobrescribir cambios de otra pestaña.

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/avisos?estado=PENDIENTE&page=0` | Página de 20 avisos propios, orden estable por creación e ID |
| POST | `/api/avisos` | Recibir origen, identificador, resumen, clase, moneda y candidato opcional |
| PUT | `/api/avisos/{id}` | Corregir clase, moneda y datos, con versión |
| POST | `/api/avisos/{id}/confirmar` | Registrar; requiere aceptarPosibleDuplicado si hay coincidencias |
| POST | `/api/avisos/{id}/descartar` | Descartar, conservando identidad y estado |

Orígenes admitidos: MANUAL, GMAIL, WHATSAPP, SMS y NOTIFICACION. La etiqueta de origen describe el canal declarado; no prueba por sí sola que el mensaje haya sido autenticado por el proveedor. La firma de Kapso y la verificación de Gmail siguen correspondiendo a sus conectores.

Los datos son un candidato de `TransaccionRequest`. Se permiten campos incompletos al recibir/corregir; al confirmar se valida todo el movimiento y su contexto autorizado. No existe endpoint público que permita enviar dinero con sólo un teléfono o un ID de usuario.

## Interfaz

Acceso: selector de lista → Herramientas → Bandeja de avisos. La ruta `/avisos` muestra los avisos **del usuario de todas sus listas**, no una bandeja compartida con otros miembros.

Filtros Pendientes/Registrados/Descartados, paginación, origen y tipo de operación, revisión en hoja, corrección de cuenta/lista/categoría/moneda/fecha, descarte y acceso al movimiento guardado. Las coincidencias enlazan al historial y muestran una confirmación específica para una operación distinta. Los importes y resúmenes numéricos respetan la preferencia de privacidad.

Añadir aviso permite transcribir el resumen seleccionado y sus datos. No interpreta un correo bancario completo ni inventa una plantilla por banco. No se deben pegar adjuntos, OTP, contraseñas o números completos de tarjeta; el servidor rechaza contenido identificado como sensible y limita el tamaño del candidato. El texto recibido nunca se envía a una IA ni se interpreta como instrucciones.

El formulario conserva el identificador ante un fallo de red para reintentar la misma recepción. No se afirma que hubo un registro antes de recibir la respuesta del servidor. Las respuestas tardías de un filtro anterior no reemplazan la vista actual. Los errores de guardar/confirmar conservan el aviso pendiente.

## Puente local

`tools/canales/canales.py` ahora envía a la API de avisos tanto candidatos normalizados como metadatos mínimos de los mensajes no reconocidos. No hace nuevos registros directamente contra `/api/transacciones`.

- `autoSaveRecognized: true` habilita la preferencia expresamente solicitada por el usuario. Está visible en el ejemplo de configuración; sin ella, el conector deja los avisos para revisión.
- Sólo intenta autoconfirmar candidatos reconocidos y sin coincidencias del servidor. Si aparece una coincidencia entre recepción y confirmación, el servidor rechaza el registro automático y el aviso continúa disponible para revisión.
- Reutiliza la clave financiera del evento durante todos los reintentos. No fuerza la aceptación de posibles duplicados.
- Los casos ambiguos no transmiten el correo completo: se envía un resumen mínimo. Para revisar el texto original de Gmail/Kapso hay que consultar el proveedor; esta entrega no incorpora enlaces ni archivos adjuntos originales.
- Los mensajes `/codex` continúan en la bandeja local para revisión por una sesión autorizada; no se ejecutan como comandos.
- La cola SQLite conserva el estado local `inbox` cuando se entregó el aviso a Kaptal. No es el mismo estado que una operación financiera registrada. La CLI sigue siendo una herramienta local, no un servicio multiusuario alojado.

No se han activado conexiones Kapso/Gmail ni reglas bancarias reales. La migración del puente no sustituye las pruebas reales de proveedor, los consentimientos ni la revocación que faltan en las siguientes etapas.

## Datos y recuperación

V7 crea exclusivamente `avisos_financieros`, con claves foráneas e índice por usuario/estado/fecha. No se reescriben migraciones anteriores ni importes históricos. Al borrar un usuario se eliminan sus avisos mediante cascada. Al borrar un movimiento, el vínculo del aviso se vuelve nulo; su estado registrado evita que se vuelva a guardar por un reintento.

El respaldo completo PostgreSQL incluye la tabla nueva. El **JSON financiero sigue en versión 5**: conserva los movimientos confirmados, pero no exporta la bandeja ni sus huellas de deduplicación. Se documenta esta limitación: no usar ese JSON como sustituto del respaldo completo de avisos. Restaurar un JSON sobre un usuario con avisos pendientes se bloquea para no sustituir las cuentas de sus candidatos. No purgar las huellas de deduplicación sin una política de retención que evite reimportaciones.

## Verificación y continuidad

Regresiones PostgreSQL: recepción/corrección sin dinero, replay, edición obsoleta, propiedad, descarte, coincidencias con manual y entre canales, dos compras iguales legítimas, autorización, moneda, datos incompletos, secretos, devolución, pago de tarjeta y borrado de usuario. La migración completa y el rollback controlado pasan por V7; la migración de fallo de prueba usa V8.

Frontend: pruebas de respuestas tardías, reintento con identidad estable y decisión explícita ante coincidencias. E2E con API/PostgreSQL, creación, confirmación repetida, revisión de duplicados, corrección y descarte, más comprobación de anchuras móviles 320/390. No equivale a una prueba en Android físico. CI añade la suite Python del puente sin credenciales reales.

Resultados concretos y límites de cada ejecución en `replica/captura-avisos/verification.json`. Próxima etapa: activar WhatsApp con Kapso y probar recepción/respuesta real, en otra rama desde develop actualizado después de integrar ésta. Después Gmail con ejemplos reales de avisos y reglas por banco; luego retomar el asistente con evidencias.
