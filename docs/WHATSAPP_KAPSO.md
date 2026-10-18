# WhatsApp personal con Kapso

Ampliacion posterior: el usuario eligio todas sus cuentas en lugar de una cuenta fija. Ver `WHATSAPP_CUENTAS_CONSULTAS.md` para `allAccounts`, consultas, borrador y vinculacion con Kaptal publicado. Los pasos de numero, firma y HTTPS de esta guia siguen aplicando; la configuracion manual de `accounts` solo corresponde al modo anterior.

Etapa `mejoras/whatsapp-kapso`, desde `develop == origin/develop == a31d95e` comprobado mediante fetch. La bandeja financiera ya está integrada en develop. El usuario activo un sandbox; su numero se verifico mediante GET autenticado sin enviar mensajes. Los datos privados quedan fuera de Git. Falta conectar la sesion de Kaptal publicado, elegir cuenta/lista y preparar HTTPS; no hay prueba de entrega real todavia.

## Qué queda preparado

`tools/canales/whatsapp_setup.py` prepara los archivos privados sin reemplazar una configuración existente ni rotar su secreto. Incluye entrada oculta para la clave del proyecto, login local de Kaptal, diagnóstico local y diagnóstico de conexión mediante lecturas autorizadas. Ninguna comprobación envía mensajes ni crea movimientos.

El receptor responde HTTP 200 después de persistir el evento en SQLite; una conexión lenta a Kaptal no bloquea la recepción del siguiente mensaje. El procesador utiliza su propia conexión SQLite y sesión; si no puede abrir la cola, no arranca el receptor. El acuse financiero sólo se envía una vez que existe el aviso en Kaptal o se registró el movimiento. No se anuncia una entrega todavía pendiente de red.

Se mantiene: firma HMAC SHA256 sobre los bytes originales, propietario y número del bot exactos, cuenta/moneda explícitas, deduplicación persistente, guardado mediante `/api/avisos`, aceptación manual de posibles duplicados y `/codex` sin ejecución remota. Audio y texto ambiguo requieren revisión; no hay transcripción de notas de voz en esta etapa.

## 1. Cuenta y número

1. Abrir [Kapso](https://app.kapso.ai), crear la cuenta y un proyecto dedicado a Kaptal.
2. Revisar el [sandbox de pruebas](https://docs.kapso.ai/docs/how-to/whatsapp/use-sandbox-for-testing) y las opciones de [conectar WhatsApp](https://docs.kapso.ai/docs/how-to/whatsapp/connect-whatsapp). Confirmar en la cuenta qué modalidad permite webhooks y qué costes aplica antes de contratar o aprovisionar un número. Esta entrega no compra números ni activa planes.
3. Diferenciar el número del bot de tu teléfono remitente. El bot recibe los mensajes; `ownerPhone` autoriza exclusivamente tu teléfono para registrarlos. El ID del número lo proporciona Kapso; no es el teléfono escrito con código de país.
4. Crear una clave del proyecto desde Integrations → API keys. Introducirla localmente mediante el comando siguiente; no enviarla al chat.

## 2. Configuración local

Desde la raíz del proyecto:

```powershell
python tools/canales/whatsapp_setup.py init
python tools/canales/whatsapp_setup.py key
```

`init` ya se ejecutó en esta sesión. Archivos excluidos de Git en `.local/canales/`:

- `config.private.json`: completar `ownerId`, `ownerPhone`, `kapsoPhoneNumberId`, `accounts` y, cuando exista el túnel, `publicWebhookUrl`.
- `secrets.private.json`: clave del proyecto y secreto generado para la firma. Mantenerlo privado; el programa lo carga sólo al proceso. Variables existentes de entorno prevalecen. En Windows los permisos efectivos dependen de la ACL de la carpeta del usuario; no se promete cifrado en reposo.
- `inbox.sqlite` y `inbox.sqlite.session`: se crean al usar el canal. La sesión contiene la cookie de refresh; la contraseña no se guarda.

No se eligieron automáticamente cuentas ni usuarios de la base. Para cada alias configurar el ID real de cuenta, lista y moneda. Ejemplo de estructura, con valores que debes sustituir:

```json
"accounts": {
  "personal": {"id": 123, "listId": 456, "currency": "MXN", "categoryId": null}
}
```

Usar una cuenta de pruebas para el primer recorrido. `autoSaveRecognized: true` refleja la preferencia del usuario; si se cambia a false, los avisos reconocidos también requieren confirmar en la app.

```powershell
python tools/canales/whatsapp_setup.py login
python tools/canales/whatsapp_setup.py doctor
python tools/canales/whatsapp_setup.py doctor --online
```

El diagnóstico local no conecta a proveedores. `--online` comprueba el perfil autenticado, cuenta activa/moneda, lista con permiso de escritura, lectura de bandeja y acceso al ID de número Kapso mediante GET. Puede renovar la sesión de Kaptal si caducó. No verifica que el número pueda enviar, ni que el proveedor haya registrado o entregado el webhook: eso exige la prueba real posterior.

## 3. HTTPS y receptor

El receptor escucha únicamente en `127.0.0.1:18765`. Preparar un túnel/proxy HTTPS hacia ese puerto y establecer `publicWebhookUrl` con el sufijo `/webhooks/kapso`. No exponer el backend, Angular, archivos privados ni la base de datos mediante ese túnel. No se ha instalado ni iniciado un túnel en esta entrega.

En Kapso, registrar un webhook del número con:

- URL HTTPS exacta terminada en `/webhooks/kapso`.
- Evento `whatsapp.message.received`.
- Payload v2 individual, sin buffering.
- Secreto igual a `KAPSO_WEBHOOK_SECRET` del archivo privado; copiarlo directamente al panel sin imprimirlo en logs o chat.

```powershell
python tools/canales/whatsapp_setup.py serve
```

La PC, el túnel y Kaptal deben permanecer encendidos. No hay tarea de inicio automático ni servicio alojado. Ejecutar un único procesador por cola. Cerrar con Ctrl+C; los eventos persistidos conservan sus claves para el siguiente inicio. La respuesta HTTP confirma recepción, no que el movimiento ya se haya guardado.

## 4. Prueba real pendiente

Enviar desde el teléfono autorizado al bot:

```text
gasto 1.00 MXN prueba whatsapp @personal
```

Comprobar en una cuenta de pruebas:

1. Aparece una sola operación y su aviso registrado; saldo, auditoría y libro diario son coherentes.
2. Redeliver del mismo evento en Kapso no crea otra operación.
3. Otro mensaje con igual importe/cuenta/fecha queda para revisión; puede ser una segunda compra real.
4. Texto incompleto queda en la bandeja, sin cambiar dinero. Un audio queda para revisión en Kapso, sin descargarse ni transcribirse automáticamente.
5. Firma inválida o remitente ajeno no registra datos.
6. Interrumpir Kaptal, enviar y recuperarlo conserva el evento y registra una sola vez. No anuncia entrega antes de recibir respuesta de Kaptal.

No hacer estas pruebas sobre saldos reales. Un acuse de WhatsApp con resultado incierto no se reintenta automáticamente para evitar mensajes duplicados. No son consultas financieras por chat todavía: eso sigue en la etapa de asistente con evidencias.

## Fuentes verificadas

- [Firma y respuesta de webhooks](https://docs.kapso.ai/docs/platform/webhooks/security).
- [Configuración y entrega](https://docs.kapso.ai/docs/platform/webhooks/overview).
- [GET del número por ID](https://docs.kapso.ai/api/meta/whatsapp/phone-numbers/get-phone-number-details).
- [MCP y permisos](https://docs.kapso.ai/docs/whatsapp/mcp): un MCP autenticado sirve para operar desde una sesión de Codex; no sustituye el receptor continuo. No se ha habilitado globalmente.

Resultados automatizados en `replica/whatsapp-kapso/verification.json`. No equivalen a una conexión real con el proveedor. Después de completar este canal, continuar Gmail con plantillas verificadas y luego el asistente con evidencias.
