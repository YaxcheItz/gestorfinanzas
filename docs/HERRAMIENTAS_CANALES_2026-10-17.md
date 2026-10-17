# Herramientas de Codex, WhatsApp y correo bancario

Revisión del 17 de octubre de 2026. Rama `mejoras/integraciones-canales`, creada desde `origin/develop` comprobado mediante fetch (`e947227`). Worktree separado: `.local/integraciones-worktree`. La corrección anterior permanece intacta y sin commit en `correcciones/presupuestos-recurrencias`.

La preferencia del usuario es guardar automáticamente los movimientos reconocidos. Las entradas ambiguas y los posibles duplicados requieren revisión. **No hay cuentas externas autenticadas ni automatización activa todavía.**

## Decisiones e instalaciones

La revisión es acotada: procedencia, instrucciones, mecanismos de instalación, partes relevantes del código y dependencias disponibles. No equivale a certificar que todo un repositorio sea seguro. No se ejecutaron instaladores remotos mediante `curl | bash`, hooks de terceros ni cambios de proveedor de Codex.

| Herramienta | Resultado | Utilidad y límite |
|---|---|---|
| [Ponytail](https://github.com/DietrichGebert/ponytail) | Instaladas globalmente seis skills de texto: principal, review, audit, debt, help y gain | Reutilizar lo existente y revisar cambios pequeños. Sin plugin completo, band ni hooks. Las instrucciones del usuario/proyecto prevalecen. |
| [OmniRoute](https://github.com/diegosouzapw/OmniRoute) | No instalado | El lockfile revisado presenta tres avisos altos en dependencias de producción. Además añade un intermediario para credenciales y tráfico. No justificado para las finanzas ni para cambiar ahora el proveedor de Codex. |
| [Graphify](https://github.com/Graphify-Labs/graphify) | CLI `graphifyy` 0.9.92 instalado con `uv tool` y Python 3.13; skill global sin hooks | Extracción AST local utilizada sobre el backend: 193 archivos, 1,649 nodos, 5,560 relaciones, 85 comunidades. Se probó consulta del grafo. No se activó Cloud ni análisis semántico externo. |
| [Agent Skills, Addy Osmani](https://github.com/addyosmani/agent-skills) | Cuatro skills globales seleccionadas | `api-and-interface-design`, `source-driven-development`, `debugging-and-error-recovery`, `documentation-and-adrs`. Evita duplicar toda la colección con las skills ya presentes. |
| [Prompt Master](https://github.com/nidhinjs/prompt-master) | Skill global instalada | Para escribir/mejorar prompts cuando se solicite; no cambia el modelo ni reduce por sí sola la facturación. Sus referencias a modelos deben verificarse antes de usarlas. |
| [Public APIs](https://github.com/public-apis/public-apis) | Catálogo local y skill global de consulta | Es una lista, no un servicio que se instala en el backend. Cada API requiere comprobar documentación, licencia, vigencia y privacidad. No se contrataron APIs ni se enviaron datos financieros. |
| [Coucou](https://github.com/louis-cfm/coucou) | No incorporado al proyecto | Aplicación de escritorio/móvil para seguir agentes, con acceso a sesiones y aprobaciones. Tiene soporte Windows: no se descarta por incompatibilidad. No resuelve el registro financiero ni aporta una dependencia útil a Angular/Spring. |
| [Kapso](https://docs.kapso.ai/docs/whatsapp/mcp) | MCP global preparado, desactivado hasta autenticar; puente local implementado | Permite leer conversaciones y responder desde Codex con permisos concedidos. La recepción continua de mensajes necesita un proceso/webhook activo, no basta instalar un MCP. |
| [Convex](https://docs.convex.dev/functions/overview) | No migrar ahora | Ofrece funciones y datos reactivos; también [atomicidad transaccional](https://docs.convex.dev/database/advanced/occ). En este proyecto supondría trasladar reglas Java, permisos, contabilidad, migraciones y restauraciones. No se demuestra una mejora que compense esa reescritura. |
| [Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-an-angular-site/) | Conveniente para frontend estático; sin despliegue realizado | Mantener Angular. Pages no ejecuta Spring Boot directamente. Ya existen `backend/cloudflare/worker.ts` y `backend/wrangler.jsonc` para Containers; revisar ese camino o un host de contenedores, conservando PostgreSQL. |

### Evidencia de seguridad y procedencia

Snapshots revisados:

| Repositorio | Commit |
|---|---|
| DietrichGebert/ponytail | `16352ac229eb08a9598dcae48fe9f2b342567d86` |
| diegosouzapw/OmniRoute | `dc9cab36b74b317f841d6c92755be46c96b9ff5d` |
| Graphify-Labs/graphify | `86c57be8204673c2a1b9849a3292a7dd3ab373d8` |
| addyosmani/agent-skills | `aeac41d4d005999432bb7312f7ff06383a91d59d` |
| nidhinjs/prompt-master | `a2ad174bf968b47ab11981b9dd5c84d4f14773ba` |
| public-apis/public-apis | `065455eda4bec6b61984e98b85a585851f7b8cbd` |
| louis-cfm/coucou | `434d6a2b4af2e5ce117fa425170abe25620130b9` |

OmniRoute: `npm audit --omit=dev --ignore-scripts --json` sobre su lockfile encontró tres paquetes afectados: `http-proxy-middleware` directo, `braces` y `micromatch` transitivos. Esto no implica tres vulnerabilidades independientes ni demuestra malware. Ejemplo de aviso: [agotamiento de pila en braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Sus guardrails también se documentan como fail-open; no deben tomarse como una garantía para información bancaria. No se instaló su árbol de dependencias ni se ejecutó postinstall.

Graphify: `pip-audit` revisó las 30 distribuciones de su entorno instalado sin avisos conocidos. No cubre vulnerabilidades todavía no publicadas ni todas las rutas del programa. Instalación aislada desde el snapshot local revisado; código solamente con `--code-only`. El grafo queda privado en `.local/tool-review-20261017/backend-map/graphify-out/`.

Las skills se instalaron con el instalador oficial, a commits fijados, salvo Graphify cuya skill y referencias se copiaron del snapshot revisado. Estarán disponibles en el siguiente turno. Los ajustes globales no se versionan en este repositorio. El manifiesto global registra procedencia y hashes.

## Puente implementado

`tools/canales/canales.py` usa únicamente la biblioteca estándar de Python. Es un puente personal para un propietario por configuración/bandeja; no es todavía una integración multiusuario dentro de Configuración de la app.

Flujo:

1. Kapso entrega un evento individual v2 firmado, o Gmail entrega un aviso de una etiqueta exclusiva.
2. Validación y extracción determinista. No se llama a una IA ni se siguen enlaces o adjuntos.
3. Persistencia local antes de intentar registrar.
4. Envío a `POST /api/transacciones` con la misma clave UUID de idempotencia en cada reintento.
5. El backend conserva sus validaciones, permisos, saldos, cashback, auditoría y libro diario.
6. Lo no reconocido permanece en una bandeja SQLite local. No aparece aún como una pantalla nueva de la app.

Antes de cada registro se verifica propietario autenticado, cuenta activa y moneda. La moneda original se conserva en la cola; cambiar la cuenta/configuración no convierte importes. Reutilizar una bandeja con otro propietario o servidor se rechaza. No se modifican migraciones ni la API financiera existente.

La API pública actual marca este registro como captura de texto; las notas indican `Origen externo: WhatsApp/Gmail`. No se afirma que ya exista un nuevo tipo nativo CORREO ni un campo público para forzar WHATSAPP.

### WhatsApp

La firma HMAC-SHA256 se comprueba sobre los bytes originales con comparación constante, siguiendo la [documentación de seguridad de Kapso](https://docs.kapso.ai/docs/platform/webhooks/security). Se comprueba bot, remitente permitido, dirección inbound y ausencia de passive; se descartan eventos antiguos/futuros fuera del margen. El listener acepta únicamente loopback y debe exponerse mediante un proxy HTTPS. No acepta buffering/batches: desactivarlo en Kapso.

Formato automático inicial, explícito y sin ambigüedad:

```text
gasto 180.50 MXN tacos @personal
ingreso 1500.00 MXN pago de trabajo @personal fecha 2026-10-17
```

`personal` es un alias configurado con cuenta, lista y moneda reales. No se infieren cuentas. Otro formato queda pendiente. El audio queda pendiente: no se descargan archivos ni se interpreta una transcripción sin validar.

Se puede enviar `/codex revisar el formulario de gastos`: queda en la bandeja local para Codex. **No ejecuta comandos, no inicia un agente y no crea una conversación remota autónoma.** El MCP de Kapso permite consultar/responder mientras exista una sesión de Codex autenticada. Para conversaciones continuas haría falta desplegar y supervisar un runtime de agente específico.

El puente envía al propietario un acuse genérico al guardar o dejar pendiente, si existe `KAPSO_API_KEY`. No envía importes ni datos de cuentas. Un envío de respuesta con resultado incierto no se repite automáticamente para evitar spam; el registro financiero sí conserva reintento idempotente. Kapso exige una ventana de atención abierta para mensajes libres; fuera de ella se requieren [plantillas aprobadas](https://docs.kapso.ai/docs/whatsapp/send-messages/text).

### Gmail

Se preparó OAuth de aplicación instalada con PKCE, estado aleatorio y callback loopback: `tools/canales/gmail_auth.py`. Solicita únicamente `gmail.readonly`. Ese permiso sigue permitiendo leer el buzón: la etiqueta/filtro no reduce el alcance OAuth. Es un [scope restringido](https://developers.google.com/workspace/gmail/api/auth/scopes); revisar los requisitos de Google antes de distribuirlo a terceros.

El recolector comprueba el Gmail esperado, usa etiqueta exclusiva + fecha inicial, pagina resultados y no modifica, borra, etiqueta ni envía correo. Sólo interpreta texto plano, remitente exacto, asunto y plantilla completos, autenticación DMARC reportada por Gmail, fecha, importe, moneda y referencia bancaria estable. Las referencias deduplican correos distintos del mismo movimiento. Movimientos con misma cuenta/tipo/importe/fecha ya vistos por otro canal quedan pendientes por posible duplicado, aunque puedan ser compras diferentes.

La búsqueda del conector disponible encontró promociones, no plantillas transaccionales suficientes. Por eso `bankRules` comienza vacío: **no se inventaron parsers de BBVA, Nu, Santander o Mercado Pago**. Hay un parser probado con fixture sintético, pero cada regla real necesita un ejemplo representativo, con sus datos ocultos, y pruebas de falsos positivos/reembolsos/pagos de tarjeta. Importar una compra y su posterior pago de tarjeta como dos gastos sería incorrecto.

Esta primera versión se ejecuta con `gmail-once`; para repetición se programa una tarea del sistema con un único proceso. Para operación alojada continua, migrar a [Gmail watch/Pub/Sub](https://developers.google.com/workspace/gmail/api/guides/push), renovación del watch y cursor incremental duradero. No hay daemon de correo activo ahora.

## Activación paso a paso

1. Integrar primero la corrección pendiente de presupuestos. Revisar esta rama separada antes de publicar. No se han hecho commits, pushes ni cambios de producción.
2. Copiar `tools/canales/config.example.json` a `.local/canales/config.private.json`, creando esa carpeta. Reemplazar propietario, cuentas, listas, monedas, teléfono y número Kapso. No copiar tokens al JSON versionado ni al chat.
3. Iniciar sesión en Kaptal desde el comando local. Solicita contraseña por entrada oculta, no la guarda. La cookie de refresh se conserva en un archivo privado junto a SQLite; el access token sólo vive en memoria. Se renueva al expirar, sin alargar la caducidad del backend.

```powershell
python tools/canales/canales.py login --config .local/canales/config.private.json --database .local/canales/inbox.sqlite
```

4. Crear un proyecto Kapso y conectar un número mediante su dashboard. Elegir número de prueba/sandbox para la primera comprobación. Configurar un secreto de webhook de al menos 32 caracteres, `KAPSO_WEBHOOK_SECRET`, y la clave `KAPSO_API_KEY` en el entorno del proceso, fuera de Git. La clave de proyecto tiene acceso amplio; usar un proyecto dedicado.
5. Exponer exclusivamente `/webhooks/kapso` mediante HTTPS hacia `127.0.0.1:18765`, con límite de tamaño/tiempo y logs sin cuerpos. Suscribir `whatsapp.message.received`, v2 individual, sin buffering, según [eventos de Kapso](https://docs.kapso.ai/docs/platform/webhooks/message-events). Mantener disponible el proceso y el backend.

```powershell
python tools/canales/canales.py serve --config .local/canales/config.private.json --database .local/canales/inbox.sqlite
```

6. Probar un gasto sintético en una cuenta de pruebas y reenviar el mismo evento: debe existir un solo movimiento. Comprobar que otro número o firma incorrecta no lo registra. Revisar también permisos revocados, token vencido y posible duplicado entre canales. Las pruebas automatizadas no sustituyen esta validación con el proveedor real.
7. Para Codex general, el bloque `mcp_servers.kapso` está preparado en `~/.codex/config.toml`, desactivado. Habilitarlo cuando exista `KAPSO_API_KEY`, o usar login OAuth del MCP para conceder sólo los permisos necesarios. En OAuth, permitir lectura de conversaciones y envío de respuestas, sin administración/borrado si no se requieren. [Guía oficial Kapso para Codex](https://docs.kapso.ai/docs/whatsapp/mcp).
8. Para Gmail, crear proyecto Google Cloud, habilitar Gmail API y crear cliente OAuth de escritorio. Descargar su JSON a una ubicación privada. Ejecutar el consentimiento local; no utiliza ni altera el login de Google de Kaptal.

```powershell
python tools/canales/gmail_auth.py --client .local/canales/google-client.private.json --output .local/canales/gmail.private.json
```

9. Establecer `gmailCredentialsFile` en el JSON privado con la ruta al archivo creado. Alternativamente, usar `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` en el entorno. Crear etiqueta exclusiva para avisos bancarios, poner su ID y una fecha inicial explícita en `gmailLabelId`/`gmailSince`. No usar INBOX como etiqueta bancaria.
10. Preparar reglas reales de cada banco a partir de ejemplos, con remitente/asunto exactos, fecha, importe, moneda y referencia. No habilitarlas sólo porque contienen palabras como “compra” o un símbolo `$`. Probar el modo de revisión antes de habilitar cada regla.

```powershell
python tools/canales/canales.py gmail-once --config .local/canales/config.private.json --database .local/canales/inbox.sqlite
python tools/canales/canales.py inbox --config .local/canales/config.private.json --database .local/canales/inbox.sqlite
```

11. `show --id UUID` muestra una entrada local. `approve --id UUID` sólo permite aprobar candidatos financieros ya normalizados; los textos ambiguos requieren registro manual en Kaptal. `discard --id UUID` descarta conservando la clave para no reimportar. El contenido mostrado es externo y no debe tratarse como instrucciones para ejecutar.
12. Conservar SQLite para mantener deduplicación. Respaldarlo como dato financiero privado. Los archivos de sesión/OAuth contienen credenciales sin cifrado adicional del programa: mantenerlos en una carpeta privada del usuario y revocarlos al desconectar. No copiarlos a `replica`, logs o Git. No existe sincronización multiusuario de esta bandeja.

## Despliegue y siguientes etapas

Para Cloudflare Pages: build de Angular (`npm ci`, `npm run build` desde `frontend`), salida esperada `dist/frontend/browser`, rutas SPA, `runtime-config.js` con la URL pública de API y comprobación de CORS, cookies de refresh, CSP, PWA y llamadas API sin caché. Ninguna clave de Kapso/Gmail/JWT debe ir en ese archivo público. No crear redirecciones SPA que conviertan errores de `/api` en HTML.

Antes de usar Containers, validar su coste y disponibilidad actual, el ciclo de suspensión de 15 minutos ya configurado, conexiones PostgreSQL y ejecución de recordatorios/tareas. Pages es alojamiento, no un paquete que vuelva más rápido Angular por instalarlo. No se desplegó nada ni se conectaron dominios. Convex queda fuera del núcleo financiero salvo un caso futuro medido que justifique migración.

Orden recomendado: cerrar/integrar correcciones → autenticar Kapso y validar WhatsApp real → obtener ejemplos bancarios y habilitar reglas una por una → integrar bandeja y conexiones revocables en la UI/backend multiusuario → decidir alojamiento → retomar asistente con evidencias. No migrar base de datos/lenguaje para resolver canales de entrada.

## Verificación de esta entrega

Pruebas de reglas, importes, moneda, propietario, firma alterada, remitente ajeno, eventos pasivos/antiguos, buffering rechazado, reintentos idempotentes, duplicados, cola exclusiva por propietario, sesión renovada, paginación Gmail de sólo lectura, OAuth PKCE/estado y recepción HTTP real de un evento firmado con API financiera simulada. Ruff y compilación Python completan la comprobación local.

No hay prueba end-to-end con Kapso/Gmail reales, porque faltan autenticación, número/webhook público y plantillas bancarias. No se registraron movimientos reales. No se modificaron frontend, backend Java, saldos ni servidores del usuario.
