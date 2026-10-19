# WhatsApp personal en Cloudflare Workers y D1

Esta entrega aloja el receptor personal de Kapso sin depender de la PC. Angular, Spring Boot y PostgreSQL permanecen en sus proveedores actuales; D1 conserva solamente cola, contexto y sesion del canal, no sustituye la contabilidad. No desplegar `backend/wrangler.jsonc` para este flujo: es otra propuesta basada en Containers.

## Preparacion

Desde la raiz del repositorio, con Node 22 o posterior y Python disponibles:

```powershell
npm ci --prefix tools/whatsapp-worker
node tools/whatsapp-worker/node_modules/wrangler/bin/wrangler.js login --scopes account:read user:read workers:write workers_scripts:write d1:write
node tools/whatsapp-worker/setup.mjs init
node tools/whatsapp-worker/setup.mjs deploy
```

`init` comprueba una cuenta Cloudflare y la identidad de `.local/canales/config.private.json`. `deploy` crea una D1 nueva, aplica el esquema y publica el Worker **pausado** con sus secretos. No cambia Kapso. Si ya existe una base con ese nombre sin correspondencia privada, se detiene en lugar de inferir que puede usarla.

Estado, clave de cifrado y configuracion de Wrangler quedan en `.local/canales-cloudflare/`, fuera de Git. No compartir esa carpeta ni los registros privados. Respaldar su clave de cifrado privadamente: sin ella no se pueden recuperar los contenidos de D1. Las copias en D1 llevan AES-GCM ligado al propietario, servidor y fila; los secretos de Kapso se inyectan como secretos del Worker.

## Vinculacion y cambio de receptor

1. Autorizar una **sesion independiente** mediante el navegador; no copiar la cookie del receptor local que sigue funcionando:

   ```powershell
   node tools/whatsapp-worker/setup.mjs connect
   ```

   Usa Google en Kaptal. El codigo se introduce solamente en la terminal. El comando guarda la cookie cifrada en D1 y retira la copia local de esa sesion despues de confirmar la escritura.

2. Comprobar las pruebas antes de activar. Respaldar SQLite y configuracion privados. Detener exclusivamente el proceso receptor que escucha en `127.0.0.1:18765`, identificado por su registro privado; no detener otros servidores.
3. Trasladar la cola conservando UUID, fechas, estados y respuestas:

   ```powershell
   node tools/whatsapp-worker/setup.mjs migrate
   node tools/whatsapp-worker/setup.mjs resume
   node tools/whatsapp-worker/setup.mjs status
   ```

4. Esperar la comprobacion programada del propietario; `/health` responde 200 y `/ready` debe responder 200. La URL generada se guarda en el estado privado. `/ready` devuelve solo un booleano, sin datos financieros.
5. Actualizar el **webhook existente** de Kapso a la URL permanente mas `/webhooks/kapso`. Mantener mismo identificador, secreto, evento individual v2 y buffering desactivado. Verificar mediante GET que el cambio quedo activo; no crear un segundo webhook.
6. El propietario envia una consulta y un movimiento autentico elegido por el mismo. Comprobar una sola operacion y una sola respuesta. Probar voz con confirmacion explicita; disponer de texto si Kapso no entrega transcripcion.
7. Cerrar el tunel temporal despues de verificar entrega al Worker. Conservar respaldo local para recuperacion, sin dejar dos procesadores activos.

Mientras se trabaja en un worktree aislado, usar la ruta real de `setup.mjs` dentro del worktree y mantener la raiz principal como directorio actual. No ejecutar dos versiones de la herramienta sobre el mismo estado.

## Recuperacion

```powershell
node tools/whatsapp-worker/setup.mjs pause
node tools/whatsapp-worker/setup.mjs status
```

El mantenimiento exige pausa y vencimiento del lease activo. Si una renovacion de sesion pierde su respuesta, se requiere otro `connect`: nunca repetir una cookie cuya rotacion es incierta. Reautorizar no repite operaciones financieras.

Las respuestas con resultado incierto se marcan antes del envio y no se reintentan automaticamente. Revisar primero la entrega en Kapso. Solo para un mensaje elegido, tras aceptar que podria enviarse dos veces:

```powershell
node tools/whatsapp-worker/setup.mjs retry-response --id UUID_DEL_EVENTO --accept-duplicate-risk
```

Para desconectar, pausar, esperar el lease y usar `disconnect`. Revoca la sesion en Kaptal antes de retirar el cifrado y conserva la cola. Desactivar tambien el webhook. Para volver al receptor local: mantener Worker pausado, restaurar un unico procesador y una autorizacion valida, y cambiar el mismo webhook; conservar las claves de idempotencia de los eventos.

## Limites y controles

- Un propietario y un numero permitido. No es una integracion multiusuario ni permite ejecutar Codex remotamente.
- Firma HMAC sobre bytes originales, cuerpo limitado, rechazo de otro remitente/bot, eventos pasivos o fechas fuera de ventana.
- Recepcion durable antes del acuse; un lease serializa procesamiento y cron recupera pendientes. Claves UUIDv5 compatibles con Python impiden duplicar el dinero al migrar o perder el acuse.
- Solo API autenticada de Kaptal para movimientos; verifica propietario, cuenta activa, moneda y posibles duplicados. Los ambiguos quedan en Avisos.
- Audio requiere revisar transcripcion y confirmar su codigo en 15 minutos. No se descargan URLs de medios ni se ejecutan instrucciones del mensaje.
- Las consultas se procesan con el backend existente; no se contrata una IA adicional.
- Sin endpoints administrativos publicos ni logs con cuerpos. El cron usa indices de pendientes para evitar recorrer todo el historial.

Segun los precios oficiales consultados el 2026-10-18, Workers Free ofrece 100,000 solicitudes diarias; D1 Free incluye 5 millones de filas leidas al dia, 100,000 escritas al dia y 5 GB totales. Se mantienen recursos dentro del plan gratuito, sin habilitar Workers Paid. Si se agota una cuota, el servicio puede dejar de atender hasta su renovacion: no se promete disponibilidad ilimitada. Kapso/Meta y el alojamiento actual de Kaptal tienen sus propios limites y costes.

Fuentes: [Workers](https://developers.cloudflare.com/workers/platform/pricing/), [D1](https://developers.cloudflare.com/d1/platform/pricing/), [cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/), [D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/), [Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/).

## Verificacion

```powershell
npm test --prefix tools/whatsapp-worker
npm run check --prefix tools/whatsapp-worker
npm audit --prefix tools/whatsapp-worker
```

`frontend/e2e/whatsapp-cloudflare.spec.ts` usa PostgreSQL/API reales con propietario sintetico y D1 persistente local. Solo simula entrega Kapso: prueba consulta sin escritura, aclaracion de cuenta, posibles duplicados, audio confirmado una vez y reinicio tras perder el acuse financiero. Esto no sustituye la prueba personal del proveedor real.
