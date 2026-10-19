# WhatsApp multiusuario: base de vinculacion

Primera parte, 2026-10-19. Rama `mejoras/whatsapp-multiusuario-base`, desde `origin/develop = 7c3e2ad`. Esta entrega establece identidad y verificacion del numero; no cambia el receptor personal desplegado ni habilita procesamiento financiero multiusuario.

## Contrato

| Metodo y ruta | Autorizacion | Resultado |
| --- | --- | --- |
| GET `/api/canales/whatsapp/conexion` | Sesion de Kaptal | Estado propio, disponibilidad, identificador, telefono enmascarado, vigencia y generacion. Nunca devuelve codigo. |
| POST `/api/canales/whatsapp/conexion` | Sesion de Kaptal | Recibe `telefono` internacional y `aceptarVinculacion: true`; devuelve codigo temporal y enlace `wa.me` para enviarlo al bot. |
| DELETE `/api/canales/whatsapp/conexion` | Sesion de Kaptal | Desconecta solo la vinculacion propia, invalida desafio, libera numero y aumenta generacion. Idempotente. |
| POST `/api/canales/whatsapp/vinculacion/evento` | HMAC original de Kapso | Consume un evento individual v2 firmado que contiene `vincular KAPTAL-...`; responde solo `verificado`, sin ID de usuario, cookies ni permisos financieros. |

El futuro Worker debe reenviar los **mismos bytes firmados** y `X-Webhook-Signature`. No reconstruir el JSON. La ruta es exclusivamente de vinculacion; un texto de gasto no ejecuta nada aqui. No cambiar el webhook actual para apuntarlo a esta ruta, porque dejaria de procesar los mensajes financieros personales.

## Modelo y decisiones

- Migracion aditiva V9: `conexiones_whatsapp`, FK con borrado en cascada; una fila por usuario y un telefono activo por numero. Los datos financieros y la tabla anterior de codigos Google no cambian.
- `id` estable y `generacion` creciente por nueva solicitud/desconexion. La siguiente parte debera ligar cualquier autorizacion/contexto a esa generacion y comprobarla antes de cada operacion; esta base no emite tales autorizaciones.
- Desafio de 192 bits aleatorios, solo SHA-256 persistido, 10 minutos de vigencia. Codigo/enlace visibles una sola vez en POST; no en estado ni logs.
- Estados propios: DESCONECTADA, PENDIENTE, CADUCADA (calculada al consultar) y VERIFICADA. VERIFICADA significa prueba del telefono, no canal financiero operativo.
- Las solicitudes pendientes no reservan un telefono ajeno. La exclusividad se aplica al verificar, con comprobacion y restriccion unica de base de datos. Una persona no puede quitarle una conexion activa a otra solo enviando otro codigo.
- Se exige desconectar la conexion verificada antes de iniciar otra. Reemision: minimo 60 segundos y hasta seis intentos por hora/usuario. Desconectar no reinicia el tiempo de emision.
- Usuario y desafio se bloquean transaccionalmente en las operaciones correspondientes. Reintentar el evento o confirmar simultaneamente no consume un codigo dos veces.
- Se conservan los digitos internacionales proporcionados. No se agrega `1` automaticamente a numeros mexicanos: adaptar discrepancias reales del proveedor requiere una decision explicita y pruebas, no una conversion silenciosa.
- Borrar usuario elimina la conexion por FK tanto en PostgreSQL migrado como en el esquema H2 generado por las entidades.

## Verificacion del evento

1. Cuerpo publico limitado a 64 KiB antes de deserializar. Limite de origen en el filtro de abuso existente.
2. Firma HMAC-SHA256 sobre bytes originales y comparacion en tiempo constante, siguiendo [Kapso](https://docs.kapso.ai/docs/platform/webhooks/security).
3. Bot esperado, mensaje de texto individual, direccion inbound, no pasivo, identificador valido y fecha reciente (10 minutos de antiguedad; hasta 5 minutos de adelanto).
4. Mensaje exactamente de vinculacion, desafio vigente, telefono del remitente igual al esperado y numero sin otra conexion activa.
5. Verificacion/consumo atomicos; codigo se retira. Eventos validos no aplicables responden `verificado: false` sin revelar cuentas o generar respuestas al telefono.

No interpreta mensajes ni extrae instrucciones de texto externo. No usa el antiguo token del PIN, no manda OTP de pago, no usa una cookie del propietario y no da a todos los usuarios una misma sesion.

## Configuracion y despliegue

Por defecto esta **deshabilitado**. Las variables del backend son:

```dotenv
WHATSAPP_CHANNEL_ENABLED=false
WHATSAPP_CHANNEL_RUNTIME_ENABLED=false
WHATSAPP_CHANNEL_BOT_PHONE=
WHATSAPP_CHANNEL_PHONE_NUMBER_ID=
WHATSAPP_CHANNEL_WEBHOOK_SECRET=
```

`BOT_PHONE` necesita `+` y codigo de pais; `PHONE_NUMBER_ID` identifica el bot esperado; `WEBHOOK_SECRET` es un secreto de al menos 32 caracteres configurado privadamente. No confundir el numero visible con el identificador del proveedor. Nunca completar `.env.example` con datos privados.

No habilitar en produccion hasta integrar UI, transporte Worker, permisos financieros limitados y migracion de la conexion personal. Si falta configuracion, GET informa `disponible: false` y las altas/eventos se rechazan con 503; la desconexion propia sigue disponible.

## Alcance de las siguientes partes

1. UI en Configuracion: telefono, consentimiento, abrir WhatsApp, consultar estado, reemitir/cancelar/desconectar; accesible y sin pedir terminal. No etiquetar como conectado financieramente un estado VERIFICADA antes de tener runtime.
2. Worker: enrutamiento por conexion, forward de pruebas, contexto/cola/limites por usuario y autorizacion restringida del backend, revocable por generacion. Los mensajes desconocidos no se atienden con la cookie personal.
3. Migracion versionada de D1/cifrado y conexion personal: respaldar, preservar UUID/respuestas, probar en copia y evitar dos procesadores activos. No reusar las variables globales de un propietario como si fueran multiusuario.
4. Pruebas con dos usuarios, numero desconocido, revocacion, reconexion, cuotas Kapso y diferencias sandbox/produccion. Segun la [documentacion oficial del sandbox](https://kapso.com/whatsapp-api-sandbox), solo participan telefonos con sesion de pruebas activa en el proyecto: cada uno necesita su alta y codigo de Kapso. Esa activacion es distinta del desafio de Kaptal. Para atender a otros usuarios de forma publica se necesita comprobar la conexion de un numero propio productivo y sus condiciones; no prometer que el boton de Kaptal elimina los limites del sandbox.
5. IA de respaldo va despues de la vinculacion/runtime; Gmail despues de cerrar esa experiencia. Ver `PLAN_MAESTRO_KAPTAL.md`.

## Verificacion de esta parte

Las pruebas incluyen HTTP autenticado, persistencia y aislamiento, consumo/expiracion, HMAC, bot/remitente/fecha incorrectos, cuerpo limitado, consentimiento, reemision, liberacion, borrado en cascada y carreras con transacciones separadas. Registrar resultados efectivos en `ESTADO_SESION.md` y `replica/whatsapp-multiusuario-base/verification.json`; no deducirlos de pruebas de la entrega personal anterior.

Fuentes: [firma Kapso](https://docs.kapso.ai/docs/platform/webhooks/security), [bloqueos Spring Data JPA](https://docs.spring.io/spring-data/jpa/reference/jpa/locking.html).

## Parte 1B: interfaz y procesamiento aislado

La rama `mejoras/whatsapp-multiusuario-runtime` incorpora la base del PR #87; integrar primero ese PR. La interfaz sustituye el PIN anterior para consultas y captura por un enlace temporal: numero internacional, consentimiento, autoguardado optativo, abrir WhatsApp, comprobar estado y desconectar. Los recordatorios anteriores permanecen separados.

`VERIFICADA` solo se muestra como «Conectado» si el backend habilita tambien `WHATSAPP_CHANNEL_RUNTIME_ENABLED`. Este indicador expresa configuracion del backend, no una prueba de entrega del proveedor; comprobar `/ready` y una consulta real al activar. El codigo/enlace solo existe en memoria de la pantalla; cerrar exige generar otro tras el tiempo de espera.

V10 agrega preferencias, contexto con caducidad y eventos procesados. Cada evento financiero y su respuesta se confirman en la misma transaccion PostgreSQL. Repetir un mensaje devuelve el resultado congelado; otra compra parecida queda en Avisos. El propietario se deriva del telefono verificado, nunca de un identificador elegido en el mensaje. Las consultas reutilizan las reglas existentes; no hay LLM nuevo en esta entrega.

El Worker multiusuario transporta el cuerpo original cifrado en D1, junto con su firma Kapso. Firma tambien la primera recepcion (`kaptal-relay-v1`, fecha en milisegundos y cuerpo) usando el secreto existente. El backend comprueba ambas firmas y rechaza mensajes recibidos antes de la vinculacion actual: una cola antigua no se aplica al nuevo propietario del mismo telefono. No se emiten JWT generales ni se usa la cookie personal.

Una cola y lease por telefono mantienen orden sin bloquear a otras personas. Antes de responder, el backend vuelve a comprobar conexion y generacion. Una desconexion posterior a esa comprobacion no puede retirar un mensaje ya enviado al proveedor. El estado `sending` se persiste antes del envio; si el acuse es incierto, no se reenvia automaticamente. Revisarlo en Kapso antes de un reintento administrativo expreso.

Audio: si el evento firmado ya contiene transcripcion, requiere confirmacion de un uso dentro de 15 minutos y del mismo dia financiero. Si falta transcripcion, se solicita texto; la consulta tardia de transcripciones del modo personal no esta incorporada todavia a este runtime. No se descargan medios ni URLs del usuario.

### Activacion posterior a la revision y publicacion

Estos pasos son operativos, no se ejecutan por instalar el codigo:

1. Integrar #87 y despues el PR de 1B, verificar CI y publicar frontend/backend con V10. Conservar el Worker personal mientras tanto.
2. Desde la raiz, `node tools/whatsapp-worker/setup.mjs backend-env --bot-phone +NUMERO_DEL_BOT` genera `.local/canales-cloudflare/backend-multiuser.private.env`. Usar el numero visible del bot, no su ID ni el numero del propietario. Configurar privadamente las cinco variables en el alojamiento del backend. No publicar ese archivo.
3. Comprobar disponibilidad de API y que cada telefono sintetico/real este autorizado por el sandbox. Tener el numero productivo y sus condiciones comprobados antes de ofrecer alta publica.
4. Respaldar la D1 remota mediante el procedimiento de `WHATSAPP_CLOUDFLARE.md`. Pausar el Worker: `node tools/whatsapp-worker/setup.mjs pause`. Esperar el lease y resolver toda operacion personal pendiente antes de migrar; no eliminarla.
5. Ejecutar `node tools/whatsapp-worker/setup.mjs prepare-multiuser`. Comprueba backend, pausa, cola personal vacia, borradores/audios caducados y receptor local detenido; exporta respaldo privado de D1 y aplica D1 0002 y despliega en modo nuevo pausado. Conserva cifrados, clave, UUID y archivo anterior. La URL/webhook no cambia.
6. Ejecutar `node tools/whatsapp-worker/setup.mjs resume`. Comprobar `/health` y `/ready`; vincular el propietario desde la app y despues otra persona. Cada una prueba una consulta propia y, cuando decida, un gasto autentico y desconexion. No crear movimientos financieros reales de prueba desde herramientas del agente.
7. Solo despues de comprobar al propietario en modo nuevo, ejecutar `node tools/whatsapp-worker/setup.mjs retire-personal-session`. Revoca la sesion personal anterior antes de retirar su cookie cifrada; no borra su archivo de eventos. La disponibilidad del servicio por si sola no demuestra esta prueba del propietario.

No reanudar Python junto al Worker. Si falla la preparacion, mantener pausado y revisar los archivos privados; no alternar modos ni restaurar una sesion por inferencia. Un despliegue fallido puede dejar el estado privado en modo nuevo mientras el Worker anterior sigue pausado: volver a ejecutar la preparacion con la misma configuracion comprobada.

### Validacion

Pruebas locales nuevas: UI con consentimiento/expiracion/errores, firmas y recepcion inalterable, aislamiento de propietarios, rechazo de numero desconocido, revocacion, confirmacion de audio, reintentos sin duplicar y cifrado/leases de D1. La prueba `whatsapp-multiusuario.spec.ts` usa API/PostgreSQL reales, dos propietarios sinteticos y reinicio de Miniflare; solo sustituye el envio final de Kapso. Resultados finales y limitaciones en el plan maestro y estado de sesion; no equivalen a activacion en produccion.

Si llega un webhook personal durante el cambio, la segunda comprobacion de la cola bloquea la activacion y conserva el mensaje. Revisar y resolver la cola antigua antes de reanudar; no saltar la comprobacion ni marcar sus filas como terminadas por rutina.
