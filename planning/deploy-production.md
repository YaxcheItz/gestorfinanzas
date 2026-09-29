--- 9f2c1d3
  name: Despliegue
  description: Configurar y preparar el despliegue a produccion
status: in_progress
---

# Contexto

El proyecto nunca se ha desplegado. No habia CI/CD, ni Dockerfile, ni
configuracion de hosting. `main` estaba en el commit inicial. La base de datos
si vive en Supabase, en el esquema `finanzas`.

Decision tomada: plan gratuito. Render para el backend, Vercel para el
frontend, Resend para el correo. Costo $0, a cambio de un arranque en frio de
~1 minuto que se mitiga con un ping periodico.

Bloqueadores de despliegue encontrados:

1. `server.port` hardcodeado a `8080`; los hosts PaaS inyectan `PORT`.
2. `api-base-url.ts` construia la URL de la API desde el hostname del navegador
   y siempre en `http`, lo que rompe en HTTPS.
3. `ddl-auto: update` altera el esquema en cada arranque.
4. Sin Dockerfiles ni documentacion de variables de entorno.

La causa raiz del 500 de restauracion (consultas nativas sin cualificar esquema)
queda prevenida en CI: el job de backend falla si aparece `nativeQuery = true`.

# Tareas

## 1. Corregir bloqueadores de despliegue

- [x] `server.port: ${PORT:8080}` en `backend/src/main/resources/application.yml`
- [x] `api-base-url.ts` lee `window.__API_BASE_URL__` con fallback a desarrollo
- [x] `frontend/public/runtime-config.js` reescribible sin recompilar
- [x] `index.html` carga `runtime-config.js` antes de Angular
- [x] `backend/Dockerfile` multistage, imagen final no root
- [x] `frontend/Dockerfile` con build Angular y serve en nginx
- [x] `frontend/nginx.conf` con fallback de SPA, cache y headers
- [x] `.dockerignore` en backend y frontend
- [x] `DEPLOY.md` con variables de entorno y orden de despliegue
- [x] `render.yaml` con el servicio backend en plan gratuito
- [x] `vercel.json` con build de Angular, fallback SPA y cache de runtime-config
- [x] `.github/workflows/keep-warm.yml` para evitar el arranque en frio
- [x] Resend como proveedor de correo, porque Render free bloquea SMTP
- [x] Interfaz `EnvioCorreo` con implementaciones SMTP y Resend
- [x] Recuperar `ci.yml`, que se habia quedado solo en la rama del fix

## 2b. Desplegar (todo pendiente, requiere cuentas)

- [ ] Crear cuenta en Resend y verificar el dominio remitente
- [ ] Desplegar backend en Render desde `render.yaml`
- [ ] Configurar `KAPTAL_API_URL` en GitHub Actions
- [ ] Desplegar frontend en Vercel, apuntando `dist/frontend/browser`
- [ ] Ajustar `CORS_ORIGINS` y `FRONTEND_URL` con los dominios reales
- [ ] Activar `MAIL_ENABLED=true` y probar la recuperacion de contrasena
- [ ] Verificar `/api/health` y el login desde el dominio publico

## 2. Verificar

- [ ] `.\mvnw.cmd test` verde con la nueva configuracion
- [ ] `npm run build` verde con `runtime-config.js` en el bundle
- [ ] `docker build` de ambas imagenes

## 3. Migrar a Flyway

- [ ] Anotar `@Version` o snapshots donde aplique
- [ ] Volcar el esquema actual de Supabase como migracion inicial
- [ ] Cambiar `ddl-auto` a `validate`
- [ ] Correr la suite contra PostgreSQL real

`ddl-auto: update` queda a proposito hasta aqui. Cambiarlo antes de tener
migraciones perderia el esquema existente de Supabase.

## 4. Primer despliegue

Ver la seccion 2b. Todo lo de infraestructura ya esta escrito en el repo.

# Fuera de alcance

- Migrar los datos de H2 a PostgreSQL en los tests: requiere Docker, que no esta
  instalado en la maquina.
- Notificaciones y recordatorios. El correo ya esta cableado en
  `application.yml` pero `MAIL_ENABLED` esta en `false`. Lo que falta es un
  scheduler, que no existe todavia. Decidir zona horaria antes de empezar.
