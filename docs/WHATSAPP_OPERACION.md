# WhatsApp: uso, recuperacion y alojamiento continuo

Etapa `mejoras/whatsapp-cierre-operativo`, base `origin/develop=1736526` (PR #83 integrado). Complementa las guias de vinculacion y consultas. Es un puente personal para un propietario; no es un producto multiusuario. No dar por completado un despliegue o una prueba personal por las pruebas automatizadas.

## Uso del bot

- `ayuda`: ejemplos de comandos.
- `saldo` o `saldo de Nombre de cuenta`: consultas de solo lectura.
- `resumen de este mes`, `categorias`, `presupuestos` y `movimientos recientes`: consultas soportadas por el interprete existente.
- `gaste 180 en comida con Nombre de cuenta`: registrar un gasto. Tambien admite ingresos reconocidos por el interprete. Si falta la cuenta, el bot la pregunta; responder con el nombre exacto. No se adivina una cuenta ni se suman monedas distintas.
- `cancelar`: descartar el borrador y las notas de voz que aun no se han confirmado. No borra movimientos ya registrados.

Los posibles duplicados quedan en Avisos para revisar. Reenviar el mismo evento conserva su clave; otra compra igual requiere revision, porque puede ser real. Si la respuesta es incierta, consultar Avisos antes de reenviar un gasto nuevo.

## Notas de voz

Se usa exclusivamente `message.kapso.transcript.text` del evento firmado o del GET autenticado al mensaje original, comprobando ID, remitente, tipo y direccion. No se descargan audios, adjuntos ni URLs del mensaje. La transcripcion depende de que Kapso la proporcione para ese numero; implementarla no garantiza disponibilidad en el sandbox.

Si no llega en el webhook, se consulta el mensaje cada 15 segundos hasta dos minutos (las incidencias de red aplican la espera general de recuperacion). Si no esta disponible, el bot pide escribir el movimiento. Solo admite textos de hasta 1,200 caracteres.

El bot muestra lo entendido y una instruccion como `confirmar audio 1234abcd`. Revisar importe, cuenta y descripcion antes de responder. El codigo corresponde a una nota, caduca en 15 minutos y solo se consume una vez. Si la transcripcion esta mal, enviar el texto corregido o cancelar. Confirmar autoriza usar ese texto; las ambiguedades y posibles duplicados siguen requiriendo aclaracion/revision. Una transcripcion por si sola nunca registra dinero.

## Recuperacion y diagnostico

La cola SQLite se guarda antes del HTTP 200. Un error de Kaptal conserva la propuesta y su clave; el servidor decide la deduplicacion contable. La renovacion de cookies usa bloqueo entre procesos. El receptor adquiere ademas un bloqueo de trabajador durante toda su vida: ejecutar una sola instancia por cola, nunca dos replicas sobre discos distintos para el mismo bot.

En local, desde la raiz:

```powershell
python tools/canales/whatsapp_host.py status --directory .local/canales
python tools/canales/whatsapp_setup.py doctor --online
```

`status` muestra cantidades por estado, existencia del archivo de sesion y respuestas inciertas; no muestra mensajes ni importes. Tener archivo de sesion no prueba autorizacion vigente. `doctor --online` verifica propietario y accesos mediante lecturas.

Los envios a Kapso tienen tres resultados locales: `replied=0` pendiente, `1` aceptado por su API y `-1` incierto si hubo una interrupcion tras empezar el envio. Aceptado no significa entregado al telefono: comprobar el estado de entrega en Kapso. `-2` significa que no se intento por ventana de atencion vencida o desconocida. No se envian mensajes libres fuera de la ventana de 24 horas; se usa un margen de cinco minutos. Los eventos historicos sin fecha conocida no se responden automaticamente.

Para una respuesta incierta: detener el receptor, comprobar la entrega en Kapso e identificar privadamente la clave del evento en SQLite. Solo si procede:

```powershell
python tools/canales/whatsapp_host.py retry-response --directory .local/canales --id CLAVE_DEL_EVENTO --accept-duplicate-risk
```

Reiniciar el receptor. Esta accion solo permite reintentar la respuesta, conserva el movimiento y su clave. Puede repetir un mensaje que el proveedor si hubiera recibido; por eso requiere revision explicita. No editar filas financieras ni restablecer claves para recuperarse de una caida.

Si la sesion esta revocada: ejecutar `whatsapp_setup.py connect`, entrar con Google y pegar el codigo exclusivamente en la terminal. No usar la contrasena de Google. Los eventos conservados se procesaran al restablecer la autorizacion.

## Alojamiento continuo preparado

El propietario eligio buscar una opcion gratuita. La propuesta vigente es la VM Always Free descrita en [WHATSAPP_ALOJAMIENTO_GRATUITO.md](WHATSAPP_ALOJAMIENTO_GRATUITO.md); Render queda como alternativa opcional de pago, sin contratar.

El contenedor `tools/canales/Dockerfile` usa Python sin dependencias externas y usuario sin privilegios (UID/GID 10001). Su contexto excluye todo salvo los tres scripts necesarios; no incluye `.local`, cookies ni configuracion personal. El puerto HTTP se publica mediante el proxy HTTPS del proveedor; no publicar directamente este puerto sin TLS y proteccion del proxy.

La plantilla separada `tools/canales/render.yaml` crea un servicio Starter y disco persistente de 1 GB. **Crear ese Blueprint contrata recursos de pago**; no esta incluido en el backend gratuito ni debe activarse sin revisar el coste en Render. La cola, config y cookie van en `/data`; no usar el filesystem efimero ni el plan gratuito para almacenar la cola.

Variables privadas del servicio:

- `KAPTAL_BRIDGE_CONFIG`: JSON con `apiUrl` HTTPS de Kaptal, `ownerId` real ya verificado, `ownerEmail`, `ownerPhone`, `kapsoPhoneNumberId`, `publicWebhookUrl` estable terminado en `/webhooks/kapso`, `allAccounts: true`, `accounts: {}` y `autoSaveRecognized: true`. Reutilizar los valores privados correctos; no copiar IDs de otra base.
- `KAPSO_API_KEY` y `KAPSO_WEBHOOK_SECRET`: en el gestor de secretos del alojamiento. No en Git, argumentos publicos ni logs.
- `PORT` (10000 por defecto), `KAPTAL_DATA_DIR` (`/data` por defecto).

`/health` indica que vive el trabajador; `/ready` indica que el ultimo ciclo y la verificacion periodica del propietario fueron correctos. Ambos devuelven solamente `ok`. Un proveedor caido no fuerza reinicios por el health check, pero deja `/ready` en 503. Monitorizar ambos, incluyendo alertas externas para `/ready`; no considerar el HTTP 200 del webhook como confirmacion financiera.

Pasos del corte, una vez revisado/aprobado el servicio:

1. Integrar y publicar el codigo revisado. Crear el servicio desde `tools/canales/render.yaml`, una instancia, despliegues automaticos desactivados. Configurar dominio estable, secretos y disco. Verificar que `/data` sea escribible por UID/GID 10001; si no, corregir propietario del montaje desde las herramientas administrativas del host antes de activar el webhook. No ampliar permisos a todo el mundo.
2. Mantener el servicio nuevo sin recibir trafico de Kapso. Detener el receptor local, pero conservar el tunel y la cola. Tomar un respaldo privado con SQLite `backup` o con todos los procesos de la cola detenidos; copiar juntos `inbox.sqlite`, `config.private.json` y la cookie `.session` mediante transporte privado. No copiar solo una base en uso; incluir todos los archivos SQLite necesarios si se usa WAL. No usar logs/variables de GitHub para transportar cookies.
3. Restaurar en `/data`, conservando el propietario y las claves de eventos. Preferiblemente autorizar una sesion independiente desde la terminal del servicio: `python whatsapp_host.py connect`; abrir el enlace mostrado en el navegador personal, entrar con Google y pegar el codigo solo en esa terminal. El servidor no necesita navegador grafico. No ejecutar dos receptores durante la migracion.
4. Reiniciar el servicio. Comprobar `/health`, `/ready`, `python whatsapp_host.py status`, propietario y contador de pendientes. No dejar el receptor local renovando una copia antigua de la misma cookie.
5. Actualizar **el webhook existente** de Kapso a la nueva URL y mantener firma, evento `whatsapp.message.received`, payload v2 y buffering desactivado. No crear otro webhook para el mismo bot. Comprobar acceso ajeno/firma invalida rechazados, evento firmado persistido y una consulta real respondida.
6. Enviar un gasto autentico elegido por el propietario. Verificar cuenta, moneda, un solo movimiento, saldo y respuesta. Probar una nota de voz y su confirmacion; si Kapso no transcribe, comprobar la alternativa por texto. Guardar evidencia sin contenido financiero.
7. Reiniciar el servicio y comprobar conservacion de estado y continuidad. Entonces cerrar el tunel y archivar privadamente el receptor local. Si hay que revertir: desactivar primero el webhook o apuntarlo a un solo receptor, transferir la cola mas reciente y autorizar una sesion independiente; nunca arrancar una copia antigua en paralelo.

Para desconectar: desactivar el webhook existente en Kapso y detener el servicio. Con el receptor detenido, ejecutar `python tools/canales/whatsapp_host.py disconnect --directory .local/canales` (en el contenedor: `python whatsapp_host.py disconnect`). Este comando revoca la cookie en Kaptal antes de eliminarla y conserva la cola. Si falla la conexion, conserva la cookie para reintentar; no anuncia revocacion sin respuesta del servidor. Borrar un archivo local por si solo no revoca una cookie en el servidor. Conservar o eliminar el respaldo/cola segun la decision del propietario. No dejar el webhook enviando a un tunel caducado.

## Criterio de cierre real

- Pruebas automatizadas de texto, voz confirmada, duplicados y recuperacion correctas.
- Consulta y gasto elegidos por el propietario comprobados en WhatsApp/Kaptal.
- Nota de voz real comprobada o limitacion de transcripcion del proveedor documentada con alternativa por texto.
- Receptor persistente desplegado, URL estable, reinicio probado y tunel local retirado.
- Procedimientos de reconexion y desconexion comprobados. Hasta entonces, la preparacion del alojamiento no equivale a operacion continua.

Fuentes oficiales consultadas el 2026-10-18: [eventos y transcripciones Kapso](https://docs.kapso.ai/docs/platform/webhooks/message-events), [GET de un mensaje](https://docs.kapso.ai/api/meta/whatsapp/messages/get-message-by-id), [servicios web Render](https://render.com/docs/web-services), [discos persistentes](https://render.com/docs/disks), [precios](https://render.com/pricing).
