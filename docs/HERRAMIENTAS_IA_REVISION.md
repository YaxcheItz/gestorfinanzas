# Revisión e instalación de herramientas de IA

Fecha: 4 de octubre de 2026. Entorno: Windows, Node 24.10.0, Python 3.14.2, Codex.

Se revisaron las fuentes públicas solicitadas, instrucciones, utilidades, hooks, manifiestos, versiones instaladas y alertas del registro npm. La revisión no equivale a una auditoría completa de cada dependencia ni demuestra ausencia de malware o explotabilidad de todas las alertas.

## Resultado por herramienta

| Fuente | Función | Estado verificado | Seguridad y límites |
| --- | --- | --- | --- |
| [UI/UX Pro Max CLI](https://www.npmjs.com/package/ui-ux-pro-max-cli) | Instala una biblioteca de criterios de diseño, accesibilidad, tipografía y patrones de interfaz. | CLI global 2.15.0 ya instalado; skill completa en `.codex/skills/ui-ux-pro-max`; ayuda y búsqueda local funcionan. | Sin hooks de instalación declarados. Cero alertas devueltas por npm para los 22 nombres de paquetes presentes revisados. Sus sugerencias necesitan criterio: la consulta de finanzas propuso tipografía que no encajaba con MonAi. |
| [n8n-mcp](https://github.com/czlonkowski/n8n-mcp) | Servidor MCP para consultar nodos, documentación y plantillas; puede gestionar workflows al conectar una instancia con su API. | 2.91.0 global y MCP de Codex existente; consulta real de nodos respondió. | Cero alertas devueltas para 110 nombres de paquetes. Telemetría desactivada y estado DISABLED comprobado. No hay credenciales de n8n en la configuración MCP inspeccionada. |
| [WorldFlowAI/everything-claude-code](https://github.com/worldflowai/everything-claude-code) | Guías de backend, frontend, código, seguridad, pruebas, aprendizaje y verificación; también incluye agentes, comandos y hooks de Claude Code. | Las 11 skills `ecc-*` conservan las instrucciones y archivos auxiliares del repositorio solicitado. Se añadieron encabezados YAML a eval-harness, project-guidelines-example y verification-loop para que Codex pueda cargarlas. | Sus hooks no se activaron: ejecutan comandos, modifican archivos y algunos bloquean trabajo fuera de tmux. No se encontró una licencia identificada por GitHub en esta copia; comprobarla antes de redistribuir. |
| [OmniRoute](https://github.com/diegosouzapw/OmniRoute) | Gateway de IA: proveedores, rutas entre modelos, fallback, claves, OAuth y API compatible con OpenAI. | 3.8.51 ya instalado globalmente; ayuda CLI comprobada. No se arrancó su servidor ni se conectaron proveedores. | Riesgo operativo mayor. Hay 6 alertas de dependencias: 1 crítica, 1 alta, 2 moderadas y 2 bajas. Detalles abajo. |
| [claude-mem](https://github.com/thedotmack/claude-mem) | Memoria persistente: registra actividad, la resume con IA y recupera contexto entre sesiones. | 13.28.0, plugin de esta sesión y worker activo; health indica initialized y mcpReady. | Cero alertas devueltas para 26 nombres de paquetes del paquete npm. Esto no audita todas las dependencias del worker empaquetado. Guarda información local y usa el proveedor Claude configurado; manejar con cuidado sesiones que contengan secretos. |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | Diseño de interfaces, animaciones, gestos, experiencia móvil y Swift. | 14 skills completas. Se añadió `emil-break-ui`, que faltaba. | Principalmente instrucciones; riesgo de instalación bajo. `break-ui` comprueba la interfaz con datos extremos, como textos largos, campos vacíos y cifras grandes. Instalarlo no lo ejecuta. |
| [Leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill) | Dirección visual, rediseño, tipografía, layouts y referencias generadas con imágenes. | 13 skills completas, coincidentes con el commit revisado. | Riesgo de instalación bajo. Algunas sugieren librerías, generación de imágenes o estilos experimentales; no todas deben aplicarse simultáneamente. |
| [Hainrixz/cyber-neo](https://github.com/Hainrixz/cyber-neo) | Análisis de vulnerabilidades, secretos, dependencias, autenticación, configuración y CI. | Reparada la instalación incompleta: ahora tiene SKILL.md, 14 referencias y 2 scripts. | Se encontró y corrigió localmente una exposición de secretos en la salida del escáner. No es un antivirus ni una garantía de seguridad; su enfoque es una revisión de código. |
| [Jakeschincariol/replica-skill](https://github.com/Jakeschincariol/replica-skill) | 11 skills para estudiar una app, diseñar y construir una versión propia, probarla, compararla y preparar su lanzamiento. | Las 11 skills instaladas con todas sus referencias y utilidades. 57 pruebas originales pasan. | Se revisaron las 6 utilidades Python: usan biblioteca estándar y no incluyen llamadas de red. Las skills de backend y despliegue pueden realizar acciones importantes al invocarse. |

En total se verificaron **51 skills** de las fuentes solicitadas. Durante la instalación hubo **13 instalaciones o reparaciones**: 11 de Replica, Cyber Neo y `emil-break-ui`. Después se repararon tres encabezados YAML de ECC que la comprobación inicial de procedencia no detectó. Se conservaron las instrucciones originales y se validaron los encabezados de las 51 skills con un parser YAML, sin errores.

## Alertas de OmniRoute

La revisión incluye dependencias anidadas y las del bundle `dist`, no solamente las versiones del manifiesto raíz. Se consultaron 1,063 nombres de paquetes presentes.

- **Crítica:** Next.js 16.3.5, [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j). La corrección es 16.3.6. La alerta afecta al uso de `next/og` ImageResponse de Node con contenido SVG controlado por un atacante. No se encontraron referencias `next/og` o `ImageResponse` en la carpeta `src` instalada; no se ha demostrado que OmniRoute exponga ese flujo. La versión vulnerable sigue presente.
- **Alta:** braces 3.0.3, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), agotamiento de pila con patrones profundamente anidados.
- **Moderadas:** copia de DOMPurify 3.4.8, [GHSA-cmwh-pvxp-8882](https://github.com/advisories/GHSA-cmwh-pvxp-8882) y [GHSA-55q2-fjhq-7xh7](https://github.com/advisories/GHSA-55q2-fjhq-7xh7).
- **Bajas:** la misma copia de DOMPurify, [GHSA-vxr8-fq34-vvx9](https://github.com/advisories/GHSA-vxr8-fq34-vvx9) y [GHSA-c2j3-45gr-mqc4](https://github.com/advisories/GHSA-c2j3-45gr-mqc4). También existe DOMPurify 3.4.16 en la instalación; esa copia no elimina la antigua.

No considero esta versión lista para exponer a Internet o cargarle claves sensibles sin actualizar y comprobar esas dependencias. Una actualización debe corregir también el bundle precompilado; reemplazar solo una dependencia raíz puede dejar intacto el código que ejecuta el servidor.

OmniRoute ofrece capacidades de túneles y MITM/certificados. Ninguna se activó. Su script postinstall puede reparar o recompilar módulos nativos: es más superficie de ejecución que una skill de Markdown.

## Privacidad y correcciones

### n8n-mcp

La [política oficial](https://github.com/czlonkowski/n8n-mcp/blob/main/PRIVACY.md) habilita telemetría por defecto y describe datos de uso, estructura de workflows e intención de cambios. Se ejecutó `n8n-mcp telemetry disable` y se confirmó `Telemetry Status: DISABLED`. La preferencia está guardada en `~/.n8n-mcp/telemetry.json`.

### Cyber Neo

En el commit revisado, `scan_secrets.py` asignaba la línea original a `redacted` y la incluía como `evidence`. Truncar a 200 caracteres no oculta una clave.

La copia instalada ahora sustituye toda la evidencia por `[REDACTED: potential secret detected]`, manteniendo tipo, severidad, archivo y número de línea. Una prueba con un secreto sintético confirmó que se detecta y no aparece en el JSON. El parche está explicado en `~/.codex/skills/cyber-neo/LOCAL_SECURITY_PATCH.md`; reinstalar la versión upstream podría sobrescribirlo.

La carpeta anterior, que solo contenía imágenes, se respaldó fuera del proyecto.

## Procedencia reproducible

Las instalaciones nuevas se hicieron con el helper oficial de `skill-installer`, fijando commits:

| Repositorio | Commit revisado |
| --- | --- |
| WorldFlowAI/everything-claude-code | `432485ba6b92c14fb357276a98957f348bcff9ee` |
| emilkowalski/skills | `e8a175de22ae1e49370fc144c1f3bb9aeedf988d` |
| Leonxlnx/taste-skill | `ce26fc25c0e5e8cab638f883de62d9a86ee5e45b` |
| Hainrixz/cyber-neo | `dcac0a8f111954e543e1e66e02a222c0c489ca74` |
| Jakeschincariol/replica-skill | `77c9436fb3d18c3d58169efb8caf4fe906b0dc51` |

Los archivos auxiliares fueron verificados y los SKILL.md originales comparados normalizando únicamente BOM y finales de línea. La copia local incluye el parche de Cyber Neo y los tres encabezados YAML añadidos a ECC. Los archivos de revisión, hashes de los ZIP, respuestas de alertas y respaldos están en `~/.codex/tool-reviews/2026-10-04/`; la validación posterior de encabezados está en `skills-frontmatter-validation.json`.

Las skills nuevas ya aparecen disponibles en la sesión posterior a su instalación. El CLI global no implica por sí solo activar un plugin: claude-mem se comprobó también mediante su worker y las herramientas disponibles en esta sesión.

## Relación con el rediseño de Kaptal

### Comprobación posterior de advertencias

La compilación de producción repetida el 4 de octubre terminó correctamente y emitió dos advertencias: paquete inicial de 582.41 kB frente al límite de aviso de 500 kB, y CSS del login un byte por encima de su límite de 4 kB. No se modificaron los límites para ocultar los avisos. El usuario aclaró que sus cuatro avisos eran tres errores de encabezado YAML de skills ECC y un aviso de menos del 50% de cuota restante en la ventana de cinco horas de Codex. Los tres errores de formato quedaron corregidos y validados; el aviso de cuota se consulta con `/status` y no se corrige modificando archivos.

Una consulta posterior de `npm audit` del frontend señala seis paquetes afectados de severidad alta, correspondientes a dos avisos directos y sus cadenas de dependencias: `braces` y `http-cache-semantics`. `npm audit --omit=dev` reporta cero vulnerabilidades. Esto describe el resultado de npm y no constituye una auditoría integral de la aplicación. El detalle quedó guardado fuera del repositorio en `~/.codex/tool-reviews/2026-10-04/frontend-advisories.json`. No se aplicó `npm audit fix --force`: la solución propuesta para parte de la cadena implica migrar Tailwind a una versión mayor.

La preferencia de seleccionar las skills pertinentes sin pedir al usuario que las nombre quedó registrada en `AGENTS.md` del proyecto.

Emil, UI/UX Pro Max, Taste y Replica ayudan directamente al diseño. Cyber Neo y las skills de seguridad ayudan a revisarlo. n8n-mcp, OmniRoute y claude-mem sirven a automatizaciones, conectividad de IA y memoria; instalarlos no cambia automáticamente la apariencia de la app.

El rediseño implementado se documenta en `replica/recon.md` y `replica/design/components.md`.
