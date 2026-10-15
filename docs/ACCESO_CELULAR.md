# Acceso local desde el celular

El frontend de desarrollo escucha en `0.0.0.0:4300` y reenvía `/api` al backend local `127.0.0.1:18081`. El celular debe abrir la IPv4 Wi-Fi de la computadora, no `localhost` ni el puerto del backend.

El 15 de octubre de 2026 se reprodujo un 403 de CORS: la configuración privada permitía `192.168.0.12`, pero la dirección activa era `192.168.0.93`. Se actualizó el origen exacto y se reinició únicamente el backend. La URL comprobada es `http://192.168.0.93:4300`.

## Si cambia la dirección de red

Desde la raíz del proyecto:

```powershell
.\scripts\configurar-acceso-lan.ps1
```

El comando detecta la interfaz con ruta por defecto y actualiza exclusivamente `.local/android-lan/backend-env.private.json`. Si hay VPN o varias interfaces, especificar `-DireccionIp` con la IPv4 privada correcta. Después hay que reiniciar el backend local cargando ese archivo de entorno; el proceso que ya está abierto no recibe cambios de variables automáticamente.

Se mantienen orígenes explícitos para localhost, 127.0.0.1 y la IP elegida, con el puerto del frontend. No se abren comodines ni se modifican producción o firewall. La cookie sin Secure y con SameSite=Lax pertenece exclusivamente a este entorno HTTP local; producción conserva su configuración.

## Comprobación de acceso y sesión

Desde `frontend`, con los servidores locales activos:

```powershell
$env:LAN_ORIGIN='http://192.168.0.93:4300'
node scripts/review-lan-auth.mjs
```

Usar la IP vigente en LAN_ORIGIN. El script rechaza destinos públicos y comprueba:

- Preflight para login, renovación y salida; credenciales y origen permitido.
- Rechazo 403 de un origen ajeno, por proxy y directamente en backend.
- Login móvil en navegador Chromium mediante la dirección LAN real, sin interceptar la API.
- Cookie HttpOnly, SameSite=Lax y comportamiento apropiado para HTTP local.
- Rechazo de renovación sin cabecera CSRF; renovación correcta con ella.
- Recarga, ausencia de desbordamiento y errores JavaScript, y cierre de sesión con borrado de cookie.

Crea una cuenta QA temporal con credenciales aleatorias y elimina únicamente esa cuenta al terminar, incluso ante fallos posteriores al registro. No utiliza cuentas ni contraseñas del propietario. Guarda el informe sin tokens en `replica/acceso-lan/verification.json`.

La prueba certifica el recorrido desde un navegador de la computadora hacia la dirección LAN. No sustituye comprobar desde el teléfono la conectividad Wi-Fi, firewall o condiciones de su navegador. No borra caché, almacenamiento ni sesiones del propietario.
