# Accesibilidad y ensayo de respaldo — Etapa 12

## Cambios

- Configuración: opciones de tema y contadores del respaldo se distribuyen según el espacio/tamaño de letra; el texto largo de la previsualización puede partirse. Cuentas: el filtro puede pasar a otra línea. Presupuestos: cabecera, texto y acción del estado vacío se adaptan sin desbordarse. Categorías: tarjetas y acciones pueden reorganizarse; filtros anuncian selección con `aria-pressed` y acciones conservan al menos 44 px de alto.
- Privacidad: una lectura de caché bloqueada oculta los importes hasta recibir la preferencia autenticada del servidor. Si falla la escritura local, la elección sigue efectiva en memoria y no lanza una excepción. No cambia el almacenamiento de autenticación ni su contrato.
- Respaldo: se aclara que CSV corresponde a la lista activa y JSON incluye datos propios de todas las listas. Las conexiones y permisos bancarios deben configurarse de nuevo por dispositivo; no se incluyen credenciales ni se reactivan canales al restaurar.

Estos ajustes responden a fallos reproducidos con letra al 200 % y errores de Storage. Se conserva el estilo general; diseño completo al final del plan.

## Comprobaciones

Rama independiente `validacion/etapa-12-accesibilidad-respaldo`, desde develop `fd821fb79e9ed86d7fc0e229733df6589441fe3c`, actualizada con `70a7f863eb458650dfffc2daff0e10ccdbf5f822` de bloqueo/mediciones. Validación combinada local: **445 pruebas frontend**, incluidas dos nuevas de caché bloqueada y las de bloqueo incorporadas; cinco pruebas del medidor, build correcto y **16 E2E correctos**. Los escenarios físicos del bloqueo se documentan por separado en #124.

El recorrido vigente usa API real y H2 efímera, con protección explícita para ejecutarse solo en localhost/127.0.0.1 y usuarios/dinero sintéticos. Incluye:

1. Descarga JSON por la interfaz y cabecera `no-store`; ausencia de claves de contraseña/tokens/credenciales en el contrato serializado.
2. Descarga CSV de la lista activa, comillas/acentos y texto que comienza por fórmula protegido; no mezcla movimientos de otra lista.
3. Previsualización con restauración deshabilitada hasta marcar confirmación explícita, controles accesibles y geometría con letra grande.
4. Restauración en otra cuenta local vacía: saldos exactos MXN/USD, saldos iniciales, compra, etiquetas, lista, historial y libro conservados; identificadores remapeados y perfil/identidad del destino conservados.
5. Rechazo del segundo intento sin duplicar movimientos ni cambiar saldos; origen intacto.

La revisión de accesibilidad recorre dashboard, cuentas, movimientos, presupuestos, categorías, metas, configuración y avisos a 320×740 y 740×320, letra al 200 %, claro/oscuro, fuente del sistema y Arial. Comprueba nombres de controles en el árbol de accesibilidad de Chromium, enlace de salto/foco, ausencia de desbordamiento horizontal y ocultación del importe sintético en los nombres accesibles. Se ejecutaron también las regresiones de cuentas y la estructura móvil.

CI370/371 detectaron desbordamientos reales que no aparecían con la fuente habitual de Windows. La espera de estilos/fuentes no los resolvió. Forzar Arial reprodujo exactamente los 327px en un viewport de 320px: el texto del estado vacío de Presupuestos salía de su caja. La matriz ampliada encontró además el filtro de Cuentas y la palabra «Presupuestos» de los contadores del respaldo. Se ajustaron padding, reflujo y columnas adaptables. Los dos recorridos pasan con ambas fuentes, manteniendo el mismo límite de ancho. El diagnóstico conserva dimensiones y clases de elementos/textos, sin copiar su contenido, y omite contenido de details cerrados. Revalidar el HEAD actualizado también en CI antes de integrar.

## Pendientes y límites

- El recorrido Chromium no sustituye TalkBack, contraste completo ni el ensayo físico de los controles ajustados. Retomar las verificaciones necesarias cuando el propietario reconecte el Samsung, conservando las evidencias previas que no cambien.
- El ensayo local no restaura datos productivos ni valida todos los formatos posibles. No añade conexiones bancarias al contrato de respaldo ni activa Gmail.
- Bloqueo nativo en #124: checks de su HEAD se verifican aparte y falta probar el diálogo automático físico. No cerrar Etapa12 ni Etapa10 por estos resultados; el piloto real sigue esperando el próximo aviso habitual consentido.
