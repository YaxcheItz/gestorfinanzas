# Despliegue

Backend Spring Boot 3.4 en Java 21. Frontend Angular 21. La base de datos es
PostgreSQL en Supabase, fuera de este repositorio.

## Orden de despliegue

1. Backend primero, porque el healthcheck del frontend no depende de la API
   pero los usuarios sÃ­ la necesitan para cargar datos.
2. Frontend despuÃ©s, con la URL de la API inyectada.

## Ramas

ProducciÃ³n despliega `main`. `develop` es integraciÃ³n: llega a producciÃ³n antes
de estar probado. El flujo es merge `develop` â†’ `main`, nunca al revÃ©s.

- Render: `render.yaml` fija `branch: main`. El campo es inmutable tras crear el
  servicio, asÃ­ que cambiarlo despuÃ©s exige borrarlo y crearlo de nuevo.
- Vercel: la rama de producciÃ³n se elige en Settings â†’ Git â†’ Production Branch.
  Vercel no apunta a `main` por defecto, hay que seleccionarla.
- CI corre en push y pull request hacia ambas ramas.

## Variables del backend

Son obligatorias. El proceso no arranca si falta alguna.

| Variable | Notas |
| --- | --- |
| `PORT` | Lo inyecta el host. Con el valor por defecto `8080` en local. |
| `SPRING_DATASOURCE_URL` | JDBC de Supabase. |
| `SPRING_DATASOURCE_USERNAME` | Usuario de la base. |
| `SPRING_DATASOURCE_PASSWORD` | ContraseÃ±a de la base. |
| `SPRING_JPA_PROPERTIES_HIBERNATE_DEFAULT_SCHEMA` | `finanzas`. Sin esto, las consultas fallan con `relation does not exist`. |
| `JWT_SECRET` | Firma de los tokens de sesiÃ³n. |
| `GOOGLE_CLIENT_ID` | ID de cliente OAuth web de Google. Debe coincidir con el origen autorizado del frontend; sin este valor, el botÃ³n Google queda desactivado. |
| `CORS_ORIGINS` | Origen del frontend, separado por comas si hay varios. |
| `FRONTEND_URL` | URL pÃºblica del frontend. Se usa en los enlaces de correo. |
| `GEMINI_API_KEY` | Opcional. Se usa cuando `AI_PROVIDER=gemini`. |
| `AI_PROVIDER` | `gemini` (predeterminado) o `groq`. |
| `GROQ_API_KEY` | Opcional. Necesaria cuando `AI_PROVIDER=groq`. Solo se configura en el backend. |
| `GROQ_MODEL` | Modelo Groq; predeterminado `openai/gpt-oss-20b`. |
| `MAIL_ENABLED` | `true` para activar el envÃ­o de correo. |
| `MAIL_PROVIDER` | `resend` en Render. `smtp` en local. |
| `RESEND_API_KEY` | Necesario cuando `MAIL_PROVIDER=resend`. |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` | Solo con `MAIL_PROVIDER=smtp`. |
| `MAIL_FROM` | Remitente. Debe ser un dominio verificado en Resend. |

## Por quÃ© el correo va por Resend y no por SMTP

El plan gratuito de Render bloquea el trÃ¡fico saliente por los puertos 25, 465
y 587. Un `JavaMailSender` normal fallarÃ­a en cada envÃ­o.

Por eso el envÃ­o pasa por la interfaz `EnvioCorreo`, con dos implementaciones:
`EnvioCorreoResend` (HTTPS, la que se usa en Render) y `EnvioCorreoSmtp` (la
original, para desarrollo). Se elige con `MAIL_PROVIDER`. Si aÃ±ades otro
proveedor de correo, implementa `EnvioCorreo` y anota el componente con
`@ConditionalOnProperty`.

## El plan gratis de Render

El servicio se duerme tras 15 minutos sin trÃ¡fico y tarda cerca de un minuto en
despertar. `.github/workflows/keep-warm.yml` hace un ping cada 10 minutos para
evitarlo. Tres advertencias, todasLas que importan:

1. **GitHub desactiva los workflows programados tras 60 dÃ­as sin actividad en
   el repositorio.** Cuando pase, el ping deja de correr sin avisar y el
   servicio se duerme. El historial seguirÃ¡ mostrando ejecuciones antiguas en
   verde, asÃ­ que no sirve para saber si sigue activo.
2. **Las 750 horas gratuitas son por cuenta, no por servicio.** Un mes son 730.
   Mantener un servicio vivo 24/7 consume casi todo el lÃ­mite. Si despliegas un
   segundo servicio y tambiÃ©n lo mantienes vivo, Render suspende el que se pase
   hasta el mes siguiente. Para dos servicios, el plan Starter de $7/mes.
3. **Este workflow no puede reportar su propia muerte.** Si deja de correr, no
   hay ejecuciÃ³n que se ponga roja.

El ping lee la variable `KAPTAL_API_URL`, que hay que crear en
Settings â†’ Secrets and variables â†’ Actions â†’ Variables.

## Supabase free se pausa tras una semana

Un proyecto en plan gratuito se pausa si no recibe actividad. La documentaciÃ³n
de Supabase dice que unos pocos requests al dÃ­a durante la semana son
suficientes, asÃ­ que un solo registro por semana lo mantiene despierto con
margen. EnvÃ­an un aviso por email una semana antes, y la pausa no borra datos:
se restaura con un click.

## ConfiguraciÃ³n del frontend

La URL de la API se resuelve en `frontend/src/app/core/services/api-base-url.ts`.
En desarrollo cae a `http://localhost:8080/api`. En producciÃ³n lee
`window.__API_BASE_URL__`, que se define en `frontend/public/runtime-config.js`.

Ese archivo se versiona vacÃ­o a propÃ³sito. En el despliegue se reescribe sin
recompilar, asÃ­ que el mismo build sirve para varios entornos:

```
window.__API_BASE_URL__ = "https://api.tudominio.com/api";
```

Por eso `index.html` lo carga antes de arrancar Angular, y nginx y Vercel lo
marcan como `no-store` para que un cambio de URL no quede cacheado.

En Vercel la reescritura ya estÃ¡ en el `buildCommand` de `vercel.json`, que
lee la variable de entorno `API_BASE_URL`. AÃ±Ã¡dela en Settings â†’ Environment
Variables, con la URL de la API incluida el sufijo `/api`. Si no la defines, el
frontend cae a rutas relativas, que es lo correcto cuando el mismo dominio
sirve el frontend y hace proxy de la API.

El `installCommand` tambiÃ©n vive en `vercel.json` (`cd frontend && npm ci`),
porque Vercel busca `package.json` en la raÃ­z del repo y aquÃ­ estÃ¡ en
`frontend/`.

## Inicio y registro con Google

El backend recibe el ID token emitido por Google Identity Services, valida su
firma, emisor, expiraciÃ³n y audiencia contra `GOOGLE_CLIENT_ID`, y despuÃ©s emite
la misma sesiÃ³n JWT y cookie httpOnly que el inicio de sesiÃ³n normal. El ID de
cliente es pÃºblico; no agregues un secreto OAuth al frontend.

En Google Cloud Console crea un OAuth Client ID de tipo **Web application** y
agrega como orÃ­genes autorizados `http://localhost:4200` para desarrollo y el
origen HTTPS del frontend publicado. Configura el valor del ID en
`GOOGLE_CLIENT_ID` del backend local y del servicio de Render. El botÃ³n aparece
cuando el backend recibe un ID de cliente vÃ¡lido.

El primer acceso con Google crea el usuario y sus datos iniciales. Si ya existe
una cuenta con ese correo, el enlace automÃ¡tico solo se permite para Gmail o
Google Workspace verificados; los demÃ¡s casos deben entrar con su mÃ©todo actual.

Si no se define, el frontend usa rutas relativas a `/api`, que es lo correcto
cuando el mismo dominio sirve el frontend y hace proxy de la API.

## El esquema `finanzas`

El proyecto despliega con `hibernate.default_schema=finanzas`, no `public`. Dos
consecuencias:

- Las consultas nativas no heredan el esquema y fallan en tiempo de ejecuciÃ³n.
  ResuÃ©lvelas con JPQL. CI rechaza `nativeQuery = true` por esto.
- `ddl-auto: update` crea y altera tablas en ese esquema al arrancar. Antes de
  tener usuarios reales, migra a Flyway y `validate`.
- `ddl-auto: update` **no** crea ni corrige `CHECK` constraints, y las pruebas
  corren contra H2, que tampoco los tiene. Un CHECK desalineado con un enum
  Java solo revienta en produccion y solo en el camino de codigo que lo usa.
  Por eso los cambios manuales de esquema van en `database/patches/`.
  Alerta real: `TipoTransaccion` tiene 4 valores y `transacciones_tipo_check`
  aceptaba 3, con lo que crear una cuenta con saldo inicial devolvia 500.

## Healthcheck

`GET /api/health` responde `200` sin tocar la base de datos. Si el host lo usa
como healthcheck, una caÃ­da de la base no se detecta ahÃ­; revisa los logs de
arranque para eso.

## Notificaciones push del navegador

El backend puede enviar avisos Web Push a los dispositivos donde el usuario los active en Configuracion. Genera una pareja VAPID y guarda sus tres valores como variables de entorno del backend:

- `WEB_PUSH_PUBLIC_KEY`
- `WEB_PUSH_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT` (por ejemplo, `mailto:soporte@kaptal.app`)

La clave privada solo va en el backend, nunca en Vercel ni en el navegador. Sin estas variables, la seccion de avisos se muestra desactivada. La PWA necesita HTTPS; para desarrollo, los avisos se deben probar con el service worker habilitado en una compilacion de produccion.

## Preparacion opcional del backend en Cloudflare

`backend/wrangler.jsonc` y `backend/cloudflare/worker.ts` dejan un Worker local que empaqueta el Dockerfile Spring existente y enruta las peticiones al contenedor. No cambia el endpoint activo de Vercel/Render. Cloudflare Containers requiere Workers Paid; tambien hay que validar que Supabase acepte conexiones desde el contenedor y medir costos antes de mover el trafico.

Variables requeridas para el contenedor:

```powershell
npx wrangler secret put SPRING_DATASOURCE_URL
npx wrangler secret put SPRING_DATASOURCE_USERNAME
npx wrangler secret put SPRING_DATASOURCE_PASSWORD
npx wrangler secret put SPRING_JPA_PROPERTIES_HIBERNATE_DEFAULT_SCHEMA
npx wrangler secret put JWT_SECRET
```

Agrega tambien los secretos opcionales que use el entorno (Google, Gemini o Groq, correo, Twilio y VAPID). `FRONTEND_URL` y `CORS_ORIGINS` deben contener los origenes exactos del frontend. Desde `backend/`, instala Wrangler con `npm install --save-dev wrangler` y ejecuta primero `npx wrangler dev`; el despliegue requiere comprobar login, cookies, CORS, base de datos, recordatorios y conexiones.

## Vinculacion de WhatsApp por PIN

El backend genera PINes de seis digitos ligados al telefono guardado en el perfil.
Cada PIN vence en 10 minutos, solo se almacena su hash, se permite un intento
cada minuto y se invalida despues de cinco verificaciones fallidas.

Configura estas variables en el backend:

- `WHATSAPP_BOT_PHONE`: numero internacional del bot, solo digitos (predeterminado `5219515791240`).
- `WHATSAPP_BOT_VERIFICATION_TOKEN`: secreto aleatorio de al menos 32 caracteres. Configura el mismo valor unicamente en el backend y en el servicio privado del bot.

El bot debe enviar `POST /api/notificaciones/whatsapp/verificar-pin` con el
header `X-WhatsApp-Bot-Token` y el JSON `{"telefono":"521...","pin":"123456"}`.
Solo cuando la respuesta tenga `data.verificado: true` debe asociar el usuario
identificado en `data.usuarioId` con el telefono de origen del mensaje. No
incluyas el secreto en el frontend, URL ni logs. La ruta de solicitud del PIN
requiere la sesion autenticada del usuario.

Hay una condicion importante antes de cambiar Vercel: los recordatorios actuales usan `@Scheduled` dentro de Spring. Un contenedor que duerme por inactividad no garantiza ejecutar esa tarea a las 9:00. Antes de poner Cloudflare en produccion, hay que mover el disparo diario a un Cron Trigger del Worker con autenticacion de servicio, o mantener el proceso despierto y verificar el comportamiento y costo del plan. Cambiar `API_BASE_URL` en Vercel por el Worker antes de ese trabajo puede interrumpir los avisos programados.
