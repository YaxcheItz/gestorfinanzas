# Vincular WhatsApp usando la sesión de Google en Kaptal

## Estado y dependencias

Etapa `mejoras/whatsapp-vinculacion-google`, creada desde `origin/develop` comprobado (`70f8caa`), con la entrega de consultas de todas las cuentas (`94712fc`, PR #80) como dependencia. Integrar primero esa entrega. Esta guía describe código preparado; no significa que la cuenta real ya esté vinculada ni que exista un webhook activo.

Publicar tanto frontend como backend antes de ejecutar el comando contra producción. Vercel sirve la página y reenvía `/api` a Render; publicar solo el frontend no incorpora los endpoints Java. V8 agrega una tabla temporal de autorizaciones sin modificar registros financieros. Mantener respaldo y el procedimiento habitual de despliegue de migraciones.

## Pasos para el propietario

1. Desde la carpeta del proyecto, ejecutar `python tools/canales/whatsapp_setup.py connect`.
2. Se abre `/vincular-canal` en Kaptal. Si no existe sesión, pulsar el botón de Google e iniciar sesión normalmente. Nunca introducir la contraseña de Google en la terminal.
3. Comprobar que la referencia de ocho caracteres coincide con la terminal y que el correo mostrado es el de la cuenta esperada. La página explica el acceso a información financiera y registro de movimientos del puente local. Pulsar **Autorizar conexión** solo si se inició este comando en una computadora propia.
4. Copiar el código y pegarlo en la terminal. La entrada está oculta. El código vence en cinco minutos; no enviarlo por chat, WhatsApp ni archivos compartidos.
5. El comando verifica identidad y renovación de sesión antes de mostrar **Tu cuenta quedo vinculada**. Conserva solo la cookie renovable en el archivo privado y el ID/correo del propietario. No guarda contraseñas, código, verifier ni token de acceso.
6. Continuar con el webhook HTTPS y la prueba real del sandbox según `WHATSAPP_KAPSO.md`. Vincular la cuenta no activa por sí solo recepción o respuestas de WhatsApp.

Si se cierra la terminal antes de terminar, iniciar de nuevo. Cada ejecución crea un secreto distinto: un código anterior no sirve para la nueva ejecución. No copiar manualmente cookies del navegador.

`connect --password` conserva la alternativa para cuentas con contraseña propia de Kaptal. No corresponde a usuarios que únicamente entran con Google. Si la API está alojada por separado, `apiUrl` debe apuntar al origen web de Kaptal con su proxy `/api`, como la configuración privada actual.

## Contrato y seguridad

- `GET /api/auth/canal/config`: disponibilidad del flujo; no devuelve datos personales.
- `POST /api/canales/vinculacion/aprobar`: requiere JWT de Kaptal y consentimiento explícito; recibe `challenge` S256 y devuelve un código aleatorio de 256 bits, de un solo uso, con vida de 300 segundos. Límite de cinco aprobaciones por usuario/minuto.
- `POST /api/auth/canal/intercambiar`: recibe `codigo`, `verifier` y correo esperado. Comprueba caducidad, hash, prueba de posesión, correo, cuenta activa y versión de revocación. Bloquea la fila y la consume en la misma transacción que emite la sesión. Límite de diez intentos por origen/minuto.
- Se reutilizan emisión, rotación, revocación y límite de sesiones existentes; la cookie nueva es independiente de la del navegador. El backend entrega `Set-Cookie` HttpOnly y `Cache-Control: no-store`; conserva Secure también durante las pruebas. El helper E2E adapta únicamente la política de transporte de Python para HTTP loopback, como Chromium; rechaza destinos remotos y esa excepción no existe en el comando real.
- La base guarda únicamente el hash del código, challenge, usuario, versión y caducidad. Los códigos vencidos se limpian al aprobar nuevas conexiones. No aparecen tokens en URLs; el fragmento solo lleva challenge, nunca el verifier.
- La página de autorización en Vercel prohíbe ser embebida en iframes y no se almacena en caché. Mantener esas cabeceras si cambia el alojamiento del frontend.
- El mecanismo S256 sigue la comprobación descrita en [RFC 7636](https://www.rfc-editor.org/rfc/rfc7636.html), no implementa un proveedor OAuth público general. Usa la autenticación Google existente de Kaptal sin solicitar nuevos permisos de Gmail.
- Este puente personal tiene los permisos de la cuenta autorizada, no permisos limitados exclusivamente a WhatsApp. La pantalla lo explica. Mantener la computadora y archivos privados bajo control del propietario. La revocación global de sesiones invalida también autorizaciones pendientes; no se añadió administración por dispositivo.

## Verificación

Pruebas de API: usuario Google sin contraseña, consentimiento autenticado, código en hash, caducidad, replay, verifier incorrecto, correo diferente, cuenta desactivada, revocación y canje concurrente con una sola sesión.

Pruebas Python: navegador por defecto, contraseña solo con opción explícita, prueba S256, identidad esperada, rechazo antes de persistir, ausencia de secretos en configuración y sesión, disponibilidad previa. Interfaz: consentimiento separado del inicio con Google, referencia visible, errores recuperables y ocultación de respuestas tardías al cambiar de usuario.

E2E sintético: aprobación en Chromium móvil contra API y PostgreSQL, canje por el puente Python, cookie guardada, recarga/renovación sin contraseña y rechazo de reutilización. La interacción con Google externo y la cuenta personal se verifican después del despliegue con el propietario; las pruebas no acceden a su cuenta ni envían WhatsApp.
