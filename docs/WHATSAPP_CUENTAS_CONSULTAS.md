# WhatsApp: cuentas del usuario y consultas

Rama `mejoras/whatsapp-cuentas-consultas`, creada desde `develop == origin/develop == a31d95e` comprobado mediante fetch. Incorpora la preparacion del PR #78; al confirmarse su merge se avanzo por fast-forward a `origin/develop == 70f8caa`, con el mismo arbol de codigo base. Esta ampliacion no sustituye esa entrega. No modifica migraciones ni el diseño del frontend.

## Comportamiento

Con `allAccounts: true`, el puente consulta el catalogo autenticado de Kaptal; no es necesario enumerar cuentas financieras en el archivo privado. Las altas, bajas y cambios de moneda se comprueban contra la API antes de guardar. El acceso sigue limitado al unico propietario configurado, al telefono remitente autorizado y al numero Kapso vinculado. Esto no habilita varios usuarios ni el acceso a bancos externos.

Ejemplos:

| Mensaje | Resultado |
|---|---|
| `saldo` / `¿Cuánto tengo en todas mis cuentas?` | Saldos actuales de cuentas activas, cada uno en su moneda |
| `saldo de Nu` | Saldo de la cuenta activa con ese nombre exacto; pide aclaracion si no es unica |
| `¿Cuánto gasté este mes?` / `resumen de este mes` | Ingresos, gastos y balance del rango, separados por moneda |
| `categorías de este mes` | Gastos por categoria y moneda |
| `presupuestos` / `gastos fijos` | Limites y recurrencias obtenidos de los servicios existentes |
| `últimos movimientos` | Operaciones recientes; no presenta esa lista limitada como historial completo |
| `Gasté 180 en comida con Nu` | Interpreta con reglas; registra via bandeja si es inequivoco y el automatico esta habilitado |
| `Gasté 180 en comida` → `Nu` | Pregunta la cuenta, conserva el borrador hasta 15 minutos y lo completa con la respuesta |
| `cancelar` | Descarta el borrador local sin registrar dinero |

Los nombres de cuentas de los ejemplos deben existir en el usuario autenticado. No se suma dinero de monedas diferentes ni se presenta la deuda de una tarjeta como efectivo disponible. Una consulta de saldo devuelve saldos por cuenta, no un patrimonio neto calculado.

No es un chat de IA de proposito general. Las reglas disponibles cubren saldos, resumen por periodos simples, categorias, presupuestos, recurrencias y registros sencillos. Preguntas que no se resuelven con seguridad devuelven una aclaracion; no inventan numeros ni se envian a un proveedor LLM. Comparaciones avanzadas, filtros arbitrarios, busqueda de todo el historial, gestion de cuentas y transcripcion de audio siguen fuera de esta entrega. Devoluciones, autorizaciones y pagos de tarjeta detectados requieren revision en la app para evitar clasificarlos como compras.

## Contrato API

`POST /api/canales/whatsapp/interpretar` requiere la sesion normal de Kaptal. El cuerpo solo acepta `texto` (1–1200 caracteres); no acepta un ID de usuario o telefono para elegir a quien consultar. Aplica un limite de 60 solicitudes por minuto y usuario.

Devuelve `ApiResponse<Respuesta>` con:

- `tipo`: `CONSULTA`, `ACLARACION` o `PROPUESTA`.
- `respuesta`, `contexto`, `sugerencias`, `desde`, `hasta`, `moneda`.
- `propuesta`: un `TransaccionRequest` solo cuando la interpretacion es suficiente.

La ruta es de solo lectura: no crea propuestas persistidas de chat, avisos, movimientos, saldos ni acciones administrativas. Reutiliza `MotorChatReglas` con cuenta obligatoria y los reportes SQL de `AiActionService`. El modo normal del chat web conserva su comportamiento anterior. Las consultas se limitan a los datos que ya exponen esos servicios del usuario; no se amplia acceso a movimientos privados de otros miembros de listas compartidas.

## Cola, respuestas e idempotencia

Los mensajes de texto del modo nuevo se guardan localmente como `whatsapp-chat`. El receptor no hace consultas financieras durante el acuse HTTP. El procesador interpreta en orden de recepcion, conserva el resultado y congela la propuesta antes de llamar a `/api/avisos`. Recibir o preguntar no registra dinero.

Repetir un mensaje mantiene la misma clave por usuario/fuente/ID externo. Reintentar una propuesta no vuelve a interpretarla con cuentas o fechas distintas. Las coincidencias de compra locales o del servidor requieren revision en Kaptal; el conector nunca fuerza aceptar un duplicado. Las transferencias se identifican como transferencias, no como ingresos.

La respuesta financiera se envia solo al telefono permitido, despues de volver a verificar la sesion del propietario. Una cola no puede reutilizarse con otro usuario, servidor, telefono o numero Kapso. Se conserva el intento de envio una sola vez para no duplicar respuestas ante un timeout incierto. La entrega de red al proveedor no puede garantizarse exactamente una vez.

La tabla SQLite existente se amplia de forma aditiva con `response`, `chat_context` y `channel_owner`. Los borradores caducan a los 15 minutos; un tema nuevo reemplaza el contexto anterior. El historial local y las respuestas pueden contener datos financieros: guardar la cola en una carpeta privada y respaldarla como informacion sensible. No hay cifrado adicional en reposo. Las respuestas largas se abrevian explicitamente y remiten al detalle en Kaptal.

## Vincular la cuenta publicada

La configuracion privada ya apunta a `https://kaptalgf.vercel.app`, con el correo indicado por el propietario y `allAccounts: true`. No se copian IDs de la base local a produccion. Tras publicar la etapa de [vinculacion por navegador](WHATSAPP_VINCULACION_GOOGLE.md), el comando siguiente abre Kaptal y permite autorizar con Google sin contrasena. Verifica correo, ID, perfil y renovacion antes de guardar la conexion.

```powershell
python tools/canales/whatsapp_setup.py connect
```

No guarda contrasena ni access token. Conserva la configuracion y la identidad de una cola existente; no las reemplaza para otro usuario o servidor. Las cuentas Google usan el navegador y un codigo de un solo uso; no necesitan habilitar una contrasena. `connect --password` queda disponible solo para cuentas con contrasena propia de Kaptal. La renovacion incluye `X-Gestion-Sesion`, que exige el backend.

Despues de publicar el nuevo endpoint en el backend correcto y configurar HTTPS segun `WHATSAPP_KAPSO.md`:

```powershell
python tools/canales/whatsapp_setup.py doctor --online
python tools/canales/whatsapp_setup.py serve
```

El diagnostico del modo nuevo incluye una interpretacion de `ayuda` sin guardar nada para detectar un backend que todavia no tenga la ruta. Cambiar solo los scripts locales no actualiza el backend desplegado. No se ha publicado ni modificado produccion, iniciado el tunel o activado el receptor en esta etapa.

## Verificacion

Resultados y limites en `replica/whatsapp-cuentas-consultas/verification.json`. Incluye aislamiento entre usuarios, varias cuentas y monedas, cuenta obligatoria/ambigua/inactiva, consultas sin escritura, actualizacion dinamica de cuentas, renovacion de sesion, caducidad/cancelacion de borrador y reintentos. El nuevo E2E ejecuta el puente Python contra API y PostgreSQL reales con usuarios sinteticos: solo el envio a Kapso esta simulado. No sustituye la prueba posterior del sandbox con el telefono real.
## Actualización de vinculación

Si inicias con Google, `connect` abre ahora Kaptal para autorizar y copiar un código de un solo uso. No solicita la contraseña de Google. Requiere publicar también la etapa descrita en [WHATSAPP_VINCULACION_GOOGLE.md](WHATSAPP_VINCULACION_GOOGLE.md); `connect --password` conserva la alternativa con contraseña propia de Kaptal.
