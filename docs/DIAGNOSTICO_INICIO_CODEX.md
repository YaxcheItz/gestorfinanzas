# Diagnóstico del aviso al iniciar Codex

Fecha: 4 de octubre de 2026.

## Aviso reportado

El usuario indica que «No active thread is available» aparece al iniciar la aplicación de escritorio. Falta identificar la ventana y el ejecutable concretos: las comprobaciones locales detectaron la CLI y sus servicios, pero no localizaron una app gráfica de Codex registrada, su proceso ni sus registros en las ubicaciones habituales inspeccionadas.

El mensaje significa que la interfaz intenta realizar una operación que necesita una conversación activa y todavía no dispone de ella. Que la conversación aún esté cargando o que haya fallado su restauración son hipótesis; no se ha demostrado cuál explica este caso.

## Comprobaciones actuales

- Se leyó `docs/ESTADO_SESION.md` y se comprobó el árbol de Git. El tema de Kaptal y los artefactos de verificación del rediseño siguen presentes. Hay numerosos cambios locales anteriores que deben preservarse.
- Los encabezados reparados de `ecc-eval-harness`, `ecc-project-guidelines-example` y `ecc-verification-loop` conservan delimitadores YAML y los nombres esperados. Las tres skills aparecen en el catálogo de esta sesión.
- La CLI seleccionada mediante npm y el servidor compartido ejecutan Codex **0.160.0**. Existe además una instalación independiente **0.158.0** en `%LOCALAPPDATA%/Programs/OpenAI/Codex/bin/codex.exe`. No se ha demostrado que esta segunda copia intervenga en el aviso.
- `codex doctor --json` encontró configuración válida, autenticación configurada, servidor local operativo, conexión HTTP disponible y negociación WebSocket correcta.
- El diagnóstico comprobó la integridad de las bases SQLite, incluido el historial de conversaciones. El inventario de archivos de sesiones y la base de estado coincidieron, sin entradas obsoletas ni archivos faltantes en esa comprobación.
- Se abrió una terminal de prueba con `codex --no-alt-screen`, se esperó a que terminara el arranque y se ejecutó `/status`. Mostró una conversación válida; el aviso reportado no se reprodujo. Se cerró esa terminal de prueba sin enviar tareas al modelo. Se creó una sesión de prueba vacía como consecuencia del arranque.
- La cadena exacta del aviso está presente en el ejecutable de la CLI. Las coincidencias encontradas en los registros SQLite con el texto de la consulta del usuario no se consideran evidencia de una emisión del error.
- El diagnóstico midió aproximadamente **1.8 GiB libres en C:**. Es un hallazgo independiente; no prueba que el espacio libre sea la causa del aviso.

## Recuperación y siguiente comprobación

En la app gráfica, seleccionar una conversación guardada o crear un chat nuevo en el proyecto es una primera comprobación reversible. Si el aviso aparece sólo durante el arranque y desaparece al abrir el chat, eso apoyaría la hipótesis de una operación anticipada. Si persiste, hacen falta los registros del cliente gráfico y el instante exacto de reproducción.

La documentación oficial recomienda iniciar un chat nuevo ante un estado atascado y, si persiste, reiniciar la app después de finalizar los chats activos. Aquí no se reinició el servidor compartido, porque mantiene esta conversación.

Si la ventana resulta ser la CLI abierta desde el escritorio, `codex resume` permite elegir una conversación previa del proyecto. Se debe elegir la conversación de trabajo: la sesión vacía de diagnóstico podría aparecer entre las más recientes, por lo que `--last` no es la mejor elección inmediatamente después de esta prueba.

## Alcance

El diagnóstico está **abierto**: la CLI funciona, pero todavía no se ha reproducido ni corregido el aviso en la ventana reportada. Se conservó la configuración de modelos, los plugins y el historial. Las pruebas y la compilación de Kaptal citadas en el resumen siguen siendo resultados de la sesión anterior; no se ejecutaron de nuevo durante este diagnóstico.

## Fuentes oficiales consultadas

- [Comandos de desarrollo: diagnóstico y reanudación](https://learn.chatgpt.com/docs/developer-commands).
- [App Server: creación y reanudación de conversaciones](https://learn.chatgpt.com/docs/app-server).
- [Solución de problemas: recuperación de estados atascados](https://learn.chatgpt.com/docs/reference/troubleshooting).

## Aclaración posterior del usuario

El usuario confirmó que la ventana es Codex CLI. La conversación actual y la prueba de inicio funcionaron; no hay evidencia de un bloqueo actual. El origen exacto del aviso sigue sin reproducirse. Si persiste o impide enviar mensajes, investigar la acción que lo dispara. Esta aclaración sustituye la referencia provisional a una app gráfica independiente.
