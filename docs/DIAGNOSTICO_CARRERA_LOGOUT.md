# Diagnostico: cierre y cambio concurrente de sesion

Fecha: 2026-11-11. Base: origin/develop e4eb3f922c7466693fa739e1d2069ac9d1c7fa01.

## Evidencia y limites

La rama de pruebas `pruebas/carrera-logout` en `ab2b8fc835b9a004d0b78cb69fcbd8f3315e6d31` contiene dos pruebas sinteticas que fallaron en A->B y A->B->A: una respuesta de logout anterior limpia la identidad nueva del frontend. La ejecucion reportada fue 22 aprobadas y 2 fallidas. HttpTestingController no aplica Set-Cookie real ni ejecuta el puente Android; no demuestra el comportamiento de cookies o avisos en un telefono. No se modificaron sesiones, credenciales ni finanzas reales.

## Rutas que deben coordinarse

- `AuthService.logout` espera operaciones Push y nativas antes de emitir logout; si la cookie cambia antes del envio podria revocar otra sesion. Al responder puede limpiar la identidad nueva.
- `AuthController.logout` revoca el refresh token recibido y devuelve Set-Cookie de borrado. Una respuesta tardia puede borrar la cookie establecida por un login posterior; comprobar identidad en JavaScript despues de recibirla no deshace esa cabecera.
- Login, registro, Google, intercambio de canal y refresh emiten cookies. Solo refresh utiliza actualmente el lock compartido `kaptal-renovar-sesion`. Web Locks tienen alcance de origen; no debe asumirse que coordinan todos los almacenes y clientes.
- `NativeSessionPlugin.update` limpia avisos y reglas cuando `closed=true` antes de guardar el estado. Una llamada de cierre antigua no verifica generacion ni identidad esperada, por lo que puede afectar configuracion posterior.
- En `SesionService.refrescar`, reutilizar un token revocado puede revocar todas las sesiones. Eliminar simplemente la cabecera Set-Cookie de logout conserva una cookie revocada que una pestana antigua podria intentar renovar; se debe distinguir revocacion explicita de rotacion/reuso sin debilitar la deteccion de robo.
- Las copias locales de borradores del PR #271 requieren una limpieza por usuario despues de confirmar el borrado remoto, incluida una barrera atomica contra escrituras tardias; la limpieza no debe cerrar una identidad nueva ni borrar datos de otra cuenta.

## Opciones por validar, no implementadas

1. Definir una generacion de sesion no secreta, con identidad de sesion distinta incluso para A->B->A, y una operacion nativa compare-and-set bajo el mutex existente antes de limpiar avisos/reglas. Determinar comportamiento al reiniciar o fallar el almacenamiento.
2. Disenar un contrato de servidor que vincule revocacion a la sesion iniciadora y evite que una respuesta anterior modifique la cookie de una sesion posterior. Evaluar versionado de cookie/endpoints y compatibilidad con APK 0.1.43 y pestanas antiguas; no exponer refresh tokens al JavaScript ni descartar deteccion de reuso.
3. Serializar desde antes de enviar hasta recibir todas las operaciones que mutan cookies, conservando `refreshEnVuelo`, `shareReplay` y el lock de refresh; disenar una alternativa segura cuando Web Locks no existan, en vez de asumir exclusion.
4. Al borrar cuenta: tras exito remoto, limpiar atomica y exclusivamente registros de la identidad confirmada e impedir escrituras antiguas, informar errores parciales y garantizar que una sesion nueva no se cierre. No borrar previamente datos locales si el borrado remoto puede fallar.

Estas son hipotesis de arquitectura, no una solucion validada. La compatibilidad de clientes antiguos y la semantica real de cookie/nativo siguen abiertas; por eso no se introduce una guarda parcial que haga pasar solo los mocks.

## Comprobaciones necesarias antes de publicar

- Pruebas de navegador real con cookie HttpOnly y respuestas ordenadas artificialmente en A->B y A->B->A; comparar login/logout/refresh y fallo de red o proceso.
- Pruebas concurrentes entre pestanas, con y sin Web Locks y con un cliente antiguo; conservar deteccion de reuso de refresh autentico.
- Pruebas aisladas Android del compare-and-set y de conservacion de avisos/reglas sinteticos, incluida respuesta nativa tardia y proceso interrumpido, sin consultar avisos ni datos reales.
- Pruebas del borrado local por identidad, error de IndexedDB, otras cuentas, escrituras en vuelo, y manejo de pendientes y exportacion. Evitar logout de una sesion nueva.
- Build, suites, CI E2E y revision independiente; verificar migracion de web y APK firmada como actualizacion antes de considerar implementacion disponible.
