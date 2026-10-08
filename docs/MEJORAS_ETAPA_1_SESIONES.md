# Etapa 1: sesiones fiables

Fecha: 6 de octubre de 2026. Estado: implementada y verificada localmente; lista para revisión.

## Alcance

Primera etapa de las correcciones autorizadas tras la revisión general. Se atendieron revocación, rotación, respuesta HTTP, coordinación entre pestañas y respuestas tardías. El resto de hallazgos conserva su lugar en [PLAN_MEJORAS_PROYECTO.md](PLAN_MEJORAS_PROYECTO.md).

## Problemas reproducidos antes de corregir

Se agregó una suite de integración sin `@Transactional` en la clase de prueba: cada operación termina su transacción y las comprobaciones posteriores leen lo que quedó persistido.

Las cinco pruebas iniciales fallaron en el código anterior:

1. La revocación por reutilización de un refresh token se deshacía al lanzar `SesionInvalidaException`.
2. Rechazar un token vencido tampoco persistía la marca de revocado.
3. Dos renovaciones simultáneas del mismo token emitían dos sucesores.
4. `/api/auth/refresh` sin cookie devolvía 500 en lugar de 401.
5. Cerrar todas las sesiones dejaba válido el access token del usuario.

También se reprodujo con los proveedores reales de `appConfig` que el interceptor global borraba la identidad antes de que el interceptor de autenticación pudiera renovar la sesión. Las pruebas anteriores del interceptor lo probaban de forma aislada y no cubrían ese orden.

## Cambios del servidor

- `SesionService.refrescar` confirma sus cambios cuando rechaza una sesión mediante la excepción específica `SesionInvalidaException`. Las demás excepciones mantienen el rollback normal.
- Emisión, rotación y revocación adquieren un bloqueo pesimista de la fila del usuario. Distintos usuarios conservan operaciones independientes.
- Primero se consulta únicamente el propietario del hash; el token se carga después de adquirir el bloqueo para no reutilizar un estado anterior a otra rotación.
- El usuario se recarga bajo el bloqueo: un filtro o un servicio llamador puede haberlo cargado antes en el contexto de persistencia.
- La revocación global aumenta `tokenVersion` y revoca los refresh tokens, invalidando también los access tokens ya emitidos.
- Un token de una versión anterior se rechaza sin volver a cerrar una sesión iniciada después de la revocación.
- La limpieza de tokens vencidos se limita al usuario bloqueado, evitando una limpieza global dentro de cada renovación.
- `GlobalExceptionHandler` responde con 401 y el formato JSON habitual cuando la sesión es inválida.

No se agregaron tablas, columnas ni dependencias. Se reutiliza `tokenVersion`, que ya formaba parte del esquema.

## Cambios del frontend

- El interceptor global recibe el resultado después del intento de renovación. El primer 401 de un access token vencido no limpia prematuramente la identidad.
- Un fallo de red, 403 o 5xx al renovar conserva la sesión y propaga el error correspondiente.
- Una cookie inválida produce un solo cierre y una sola navegación, incluso con varias solicitudes esperando el mismo refresh.
- Una respuesta tardía del token anterior reutiliza el token actualizado sin otra rotación.
- La API Web Locks coordina renovaciones entre pestañas del mismo origen. Al adquirir el bloqueo se comprueba si otra pestaña ya guardó un token nuevo.
- Los eventos de almacenamiento actualizan la identidad y sacan a la otra pestaña de la pantalla anterior cuando se cierra o cambia la cuenta.
- Una renovación en vuelo no restaura una sesión cerrada. Una respuesta 401 de la cuenta anterior no borra ni reintenta operaciones de una cuenta nueva.
- El listener de almacenamiento se elimina al destruir el servicio.

## Verificación final

| Comprobación | Resultado |
|---|---|
| Suite backend con `mvnw.cmd test` | 240 pruebas, 36 suites, 0 fallos, 0 errores y 0 omitidas |
| Nueva suite `SesionSeguridadIntegrationTest` | 8 pruebas aprobadas |
| Suite frontend con runner limitado | 186 pruebas, 23 archivos, todas aprobadas |
| Nuevo archivo `auth.service.spec.ts` | 12 casos de sesión, interceptores combinados y coordinación |
| Compilación de producción Angular | Correcta; paquete inicial 604.63 kB |
| Navegador Chromium, build de producción | Dos pestañas arrancan con token vencido; una sola renovación; cierre compartido y salida al login; 0 errores JavaScript |
| Diff de los archivos de aplicación de esta etapa | Sin errores de espacios; se acepta CRLF de Windows |

Comandos reproducibles desde sus directorios correspondientes:

```powershell
# backend
.\mvnw.cmd test

# frontend
npm.cmd test -- --watch=false --runner-config=../replica/navegacion-captura/vitest.config.mjs
npm.cmd run build

# raíz del proyecto
node replica/mejoras-etapa1/browser-sesiones.mjs
```

La suite de Angular se ejecutó sin paralelizar archivos para respetar los límites de memoria conocidos del equipo. Los intentos restringidos iniciales de Maven y Angular fallaron por el entorno; las ejecuciones verificadas utilizaron los permisos concedidos para las herramientas.

Evidencias: `backend/target/surefire-reports/`, `replica/mejoras-etapa1/browser-checks.json`, `replica/mejoras-etapa1/browser-sesiones.mjs` y `replica/mejoras-etapa1/verification.json`.

## Límites y pendientes

- La integración del backend utilizó H2 en modo PostgreSQL. No se ejecutó esta verificación contra PostgreSQL real ni producción; esa cobertura está en la etapa 6.
- Chromium ejecutó el frontend real con API sintética y service workers bloqueados. No fue una prueba integrada contra el backend desplegado ni de cookies del proxy de producción.
- Sin Web Locks sigue existiendo coordinación dentro de la instancia y protección del servidor; no se afirma coordinación entre pestañas en navegadores que no ofrezcan esa API.
- La reutilización real de una cookie revocada mantiene una política estricta: invalida las sesiones de su versión. No hay un periodo que permita volver a utilizar la cookie rotada.
- El logout individual sigue revocando su refresh token; la invalidación inmediata de access tokens documentada aquí corresponde a la revocación global. La gestión por dispositivo queda para la etapa 8.
- El access token sigue en `localStorage`. La migración a memoria, CORS, cabeceras y límites de abuso están en la etapa 8.
- La compilación conserva dos advertencias: 604.63 kB frente al presupuesto inicial de 500 kB y CSS de login un byte por encima de 4 kB. No se cambiaron los presupuestos.
- No se midió cobertura porcentual ni se agregó un linter en esta etapa.
- No se realizó commit, despliegue ni modificación de la base de producción. Se preservaron cambios locales anteriores.

## Siguiente revisión

La etapa 1 está lista para revisar. La siguiente es exactitud financiera: MSI, vínculo compra/cuotas, centavos, recurrencias y zona horaria. No se inició esa implementación en este turno.
