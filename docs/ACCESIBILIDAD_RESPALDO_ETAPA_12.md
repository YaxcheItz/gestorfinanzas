# Accesibilidad y ensayo de respaldo — Etapa 12

## Cambios

- Configuración: las opciones de tema se distribuyen según el espacio y el tamaño de letra. Presupuestos: la cabecera puede pasar a otra línea y la acción del estado vacío conserva su texto dentro de la pantalla. Categorías: tarjetas y acciones pueden reorganizarse sin desbordarse; filtros anuncian su selección con `aria-pressed` y acciones conservan al menos 44 px de alto.
- Privacidad: una lectura de caché bloqueada oculta los importes hasta recibir la preferencia autenticada del servidor. Si falla la escritura local, la elección sigue efectiva en memoria y no lanza una excepción. No cambia el almacenamiento de autenticación ni su contrato.
- Respaldo: se aclara que CSV corresponde a la lista activa y JSON incluye datos propios de todas las listas. Las conexiones y permisos bancarios deben configurarse de nuevo por dispositivo; no se incluyen credenciales ni se reactivan canales al restaurar.

Estos ajustes responden a fallos reproducidos con letra al 200 % y errores de Storage. Se conserva el estilo general; diseño completo al final del plan.

## Comprobaciones

Rama independiente `validacion/etapa-12-accesibilidad-respaldo`, desde develop `fd821fb79e9ed86d7fc0e229733df6589441fe3c`. Validación local: **436 pruebas frontend**, incluidas dos nuevas de caché bloqueada, build correcto y **15 E2E correctos**. La rama de bloqueo tiene pruebas adicionales propias y se valida por separado.

El recorrido vigente usa API real y H2 efímera, con protección explícita para ejecutarse solo en localhost/127.0.0.1 y usuarios/dinero sintéticos. Incluye:

1. Descarga JSON por la interfaz y cabecera `no-store`; ausencia de claves de contraseña/tokens/credenciales en el contrato serializado.
2. Descarga CSV de la lista activa, comillas/acentos y texto que comienza por fórmula protegido; no mezcla movimientos de otra lista.
3. Previsualización con restauración deshabilitada hasta marcar confirmación explícita, controles accesibles y geometría con letra grande.
4. Restauración en otra cuenta local vacía: saldos exactos MXN/USD, saldos iniciales, compra, etiquetas, lista, historial y libro conservados; identificadores remapeados y perfil/identidad del destino conservados.
5. Rechazo del segundo intento sin duplicar movimientos ni cambiar saldos; origen intacto.

La revisión de accesibilidad recorre dashboard, cuentas, movimientos, presupuestos, categorías, metas, configuración y avisos a 320×740 y 740×320, letra al 200 %, claro/oscuro. Comprueba nombres de controles en el árbol de accesibilidad de Chromium, enlace de salto/foco, ausencia de desbordamiento horizontal y ocultación del importe sintético en los nombres accesibles. Se ejecutaron también las regresiones de cuentas y la estructura móvil.

## Pendientes y límites

- El recorrido Chromium no sustituye TalkBack, contraste completo ni el ensayo físico de los controles ajustados. Retomar las verificaciones necesarias cuando el propietario reconecte el Samsung, conservando las evidencias previas que no cambien.
- El ensayo local no restaura datos productivos ni valida todos los formatos posibles. No añade conexiones bancarias al contrato de respaldo ni activa Gmail.
- Bloqueo nativo en #124: checks de su HEAD se verifican aparte y falta probar el diálogo automático físico. No cerrar Etapa12 ni Etapa10 por estos resultados; el piloto real sigue esperando el próximo aviso habitual consentido.
