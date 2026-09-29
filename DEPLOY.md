# Despliegue

Backend Spring Boot 3.4 en Java 21. Frontend Angular 21. La base de datos es
PostgreSQL en Supabase, fuera de este repositorio.

## Ordem de despliegue

1. Backend primero, porque el healthcheck del frontend no depende de la API
   pero los usuarios sí la necesitan para cargar datos.
2. Frontend después, con la URL de la API inyectada.

## Variables del backend

Son obligatorias. El proceso no arranca si falta alguna.

| Variable | Notas |
| --- | --- |
| `PORT` | Lo inyecta el host. Con el valor por defecto `8080` en local. |
| `SPRING_DATASOURCE_URL` | JDBC de Supabase. |
| `SPRING_DATASOURCE_USERNAME` | Usuario de la base. |
| `SPRING_DATASOURCE_PASSWORD` | Contraseña de la base. |
| `SPRING_JPA_PROPERTIES_HIBERNATE_DEFAULT_SCHEMA` | `finanzas`. Sin esto, las consultas fallan con `relation does not exist`. |
| `JWT_SECRET` | Firma de los tokens de sesión. |
| `CORS_ORIGINS` | Origen del frontend, separado por comas si hay varios. |
| `FRONTEND_URL` | URL pública del frontend. Se usa en los enlaces de correo. |
| `GEMINI_API_KEY` | Opcional. Sin ella el asistente de IA queda deshabilitado. |
| `MAIL_ENABLED` | `true` para activar el envío de correo. |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | Necesarios cuando `MAIL_ENABLED=true`. |
| `JWT_SECRET` | Mínimo 32 bytes. |

## Configuración del frontend

La URL de la API se resuelve en `frontend/src/app/core/services/api-base-url.ts`.
En desarrollo cae a `http://localhost:8080/api`. En producción lee
`window.__API_BASE_URL__`, que se define en `frontend/public/runtime-config.js`.

Ese archivo se versiona vacío a propósito. En el despliegue se reescribe sin
recompilar, así que el mismo build sirve para varios entornos:

```
window.__API_BASE_URL__ = 'https://api.tudominio.com/api';
```

Por eso `index.html` lo carga antes de arrancar Angular, y nginx lo marca como
`no-store` para que un cambio de URL no quede cacheado.

Si no se define, el frontend usa rutas relativas a `/api`, que es lo correcto
cuando el mismo dominio sirve el frontend y hace proxy de la API.

## El esquema `finanzas`

El proyecto despliega con `hibernate.default_schema=finanzas`, no `public`. Dos
consecuencias:

- Las consultas nativas no heredan el esquema y fallan en tiempo de ejecución.
  Resuélvelas con JPQL. CI rechaza `nativeQuery = true` por esto.
- `ddl-auto: update` crea y altera tablas en ese esquema al arrancar. Antes de
  tener usuarios reales, migra a Flyway y `validate`.

## Healthcheck

`GET /api/health` responde `200` sin tocar la base de datos. Si el host lo usa
como healthcheck, una caída de la base no se detecta ahí; revisa los logs de
arranque para eso.
