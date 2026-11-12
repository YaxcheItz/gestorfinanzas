# Verificación de Codex tras actualización de terminal — 12 noviembre 2026

Solicitud: comprobar instalación, skills, MCP y plugins antes de continuar Kaptal. El propietario aclaró que el fallo ocurrió al actualizar desde terminal y que ejecutó comandos para recuperar una dependencia. Revisión local, sin reinstalar, cambiar credenciales ni activar integraciones deshabilitadas.

## Resultado comprobado

- El comando del PATH usa Codex CLI0.167.2 mediante npm. Tanto `@openai/codex` como su paquete nativo Windows x64 están presentes en versión0.167.2. El binario arranca, la configuración TOML carga y el protocolo app-server inicializa correctamente sin crear tareas de agente.
- Registros npm: las instalaciones de Codex omitieron la dependencia opcional `codex-win32-x64`; una consulta posterior no la encontró y después se instaló explícitamente `@openai/codex@0.167.2-win32-x64` mediante alias, con salida0. Esto respalda el fallo de dependencia recordado por el usuario; no establece la causa última de la omisión.
- `codex doctor --json`: instalación consistente, autenticación configurada, conectividad HTTP y handshake WebSocket correctos; integridad de las bases inspeccionadas correcta. No se imprimieron valores de autenticación ni se copiaron a este informe.
- Skills:107 archivos globales/sistema y69 en cachés de plugins, legibles y con encabezados básicos presentes. El cargador real `skills/list` reconoce115 skills (110 user y5 system), con0 errores. Son inventarios distintos: las cachés también incluyen componentes no activos. Existen dos copias de coding-standards y security-review con nombre repetido; no se borraron.
- `codex plugin list --json`:16 instalados,15 habilitados; todas las fuentes locales declaradas existen. Cinco plugins de documentos/PDF/hojas/presentaciones/plantillas, cinco bundled, Warp, cuatro remotos y Claude-mem deshabilitado. La presencia no acredita todos sus flujos funcionales o cuentas externas.
- MCP: configuración/listado válidos. Node REPL ejecuta una operación simple; `@oai/sky` importa; n8n responde una consulta de documentación de Set. El catálogo de Plugin Management también responde. No se ejecutaron workflows, documentos personales ni acciones sobre cuentas.
- Kapso y REA permanecen deshabilitados. Claude-mem permanece deshabilitado. Superpowers tiene caché6.3.0 y una entrada de configuración habilitada, pero no aparece entre los plugins instalados del catálogo activo: no se certifica como activo ni se reinstala automáticamente.
- Windows registra app26.1106.6628.0 y runtime26.1111.570.0 con estadoOk. Existe además una instalación standalone0.158.0 enlazada en otro directorio; el primer comando del PATH y el ejecutable auditado son los de npm0.167.2. No se modificó el PATH ni se eliminó ninguna instalación.

## Corrección aplicada y advertencias

Se eliminó únicamente `thread-name` de `[tui].terminal_title`, identificada por doctor como opción desconocida. `thread-title` ya estaba presente. Respaldo privado previo: `~/.codex/config.toml.backup-20261112-terminal-title`. Se comparó el TOML antes/después para confirmar que no cambió ningún otro valor. Doctor posterior: título e instalación enOk;19 comprobaciones pasan a20 y las advertencias pasan de6 a5.

Las5 advertencias restantes son: socket del daemon no accesible, proyecto fuera de Dev Drive, variables opcionales del bridge de navegador ausentes, exclusiones de Defender no verificadas e inventario de sesiones desalineado con el índice (27 referencias en cada dirección). Las bases pasan integridad; no se afirma pérdida de conversaciones ni que la actualización causara esa desalineación. No se reiniciaron servicios activos, migraron historiales ni relajó Defender para eliminar advertencias.

Prueba del navegador integrado: `createBrowserTab` hacia `about:blank` informa que el host de acceso no está disponible en esta sesión. Esto es una limitación funcional comprobada, aunque browser y Computer Use estén instalados; importar el módulo nativo no acredita control de ventanas. La CLI y las pruebas locales de Playwright funcionan. No se declara que absolutamente todas las capacidades estén operativas.

Evidencia privada en `.local/codex-verificacion-20261112/` del checkout principal: diagnóstico antes/después, registro de plugins y respuesta del cargador. No subir esos JSON ni registros a Git. Este informe contiene solo resultados resumidos.

Referencias oficiales: [plugins y diferencias entre superficies](https://learn.chatgpt.com/docs/plugins.md) y [aplicación Windows](https://learn.chatgpt.com/docs/windows/windows-app.md). La revisión separa instalado, cargado y funcional; no es una auditoría de seguridad del código de cada skill o plugin.
