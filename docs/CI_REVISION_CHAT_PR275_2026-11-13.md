# PR275: publicación final y revisión visual — 13 noviembre 2026

## Publicación del contenido conservado

La conexión Git HTTPS directa volvió a fallar al consultar/subir a GitHub443; `gh` tampoco tenía una credencial válida. No se cambiaron certificados, DNS, credenciales ni configuración global. Se utilizó el plugin GitHub para publicar los blobs y el árbol del contenido confirmado, verificar sus identificadores y avanzar las referencias con comprobación del padre, sin force push.

| Contenido | Commit local original conservado | Commit publicado por el conector | Árbol idéntico comprobado |
| --- | --- | --- | --- |
| Código final del chat | `baba89a7900ec1ecbce733fb9bfc2abad08a3c32` | `f526c82014c94dee9811e3a9572d467a73e83eec` | `5b2dfb0ce4070a3fa5cef49c7a73746bf0560795` |
| Respaldo documental anterior | `11e8e1c025b01d691bba7458ab4efeb9997148a4` | `b081a39ae61e531b758a275c9bb9009332f71e53` | `cfee96ad0898d61c8cbb9a531dc4f05ffa88dec3` |

El conector usa el nombre de cuenta «Yaxche Ramirez» y el mismo correo del Git local; no añade coautores. La fecha/nombre del commit cambian el SHA, no el árbol. Los originales siguen accesibles mediante `respaldo/chat-baba89a-antes-conector` y `respaldo/documentos-11e8e1c-antes-conector`. Se reconstruyeron localmente los objetos remotos a partir de sus metadatos, se verificó el SHA exacto y se sincronizaron ramas y referencias locales con árbol idéntico. No confundir esto con haber subido literalmente los objetos originales.

[PR275](https://github.com/YaxcheItz/gestorfinanzas/pull/275) conserva la rama `mejoras/chat-pantalla-navegacion`, base develop `fe13575532c8c055fe699374660988a888b01f6f` y estado borrador. Su head publicado se comprobó con el conector.

## CI del código final

- [CI general 43504281521](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/43504281521): completed/success, seis trabajos aprobados sobre el head exacto f526c82. Registro E2E:124 aprobados en12,6min y4PWA omitidos condicionales; después4PWA aprobados en22,9s con configuración específica.
- [Android 43504281163](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/43504281163): completed/success sobre `f526c82014c94dee9811e3a9572d467a73e83eec`.
- Frontend del nuevo SHA: build y579 pruebas/66 archivos aprobados, comprobados en el registro remoto.

## Revisión visual realizada

Se inspeccionaron capturas finales de Chromium del CSS idéntico al publicado: inicio claro/oscuro, propuesta, editor y escritorio. La comparativa privada `.local/revision-chat-pr275/index.html` presenta cinco estados y diez imágenes de antes/después. Se comprobó su renderizado en Edge aislado, carga de todas las imágenes y ausencia de desborde horizontal a390px. Sirve para decidir el diseño; no representa una sesión financiera real.

| Superficie | Observación |
| --- | --- |
| Inicio del chat | Móvil a pantalla completa, tres accesos con texto claro y compositor separado. El espacio amplio centra la bienvenida; queda sujeto al gusto del propietario. |
| Propuesta | Mensaje del usuario diferenciado, resumen y acciones de descartar/guardar claros. La acción Editar se conserva junto a la respuesta. |
| Editor | Campos en una zona desplazable y acciones inferiores separadas. Los nombres largos de selectores muestran solo la parte que cabe; no demuestra pérdida del valor. |
| Escritorio | Panel centrado con ancho limitado; propuesta y compositor legibles. |
| Navegación | Capturas y regresiones anteriores acreditan barra global solo en Inicio. Esta sesión no altera calendario ni rediseña el historial. |

No se implementó otro rediseño ni se declara aceptación estética del propietario. La siguiente decisión corresponde a esta comparativa concreta, antes de preparar una entrega.

## Comprobación puntual de captura física

Una captura nativa anterior con IME no mostraba la cabecera mientras la medición posterior sí situaba Volver a34px. Para distinguir un instante de captura de un defecto estable, se reutilizó la APK QA separada, previa comprobación de paquete, puerta de arranque, CSP, HTTP nativo desactivado, destinos ficticios y CSS idéntico al blob final. No se reconstruyó ni modificó el código de aplicación.

El primer intento no llegó al recorrido: el teléfono estaba en Dozing/bloqueado y el click esperó estabilidad. Se conserva como intento fallido del arnés, sin atribuirlo a la funcionalidad del chat. Tras el propietario desbloquearlo, la prueba local adicional aprobó1/1 en16,3s, con espera de1,2s y dos frames antes de cada captura. Teclado Samsung abierto confirmado por flags; viewport384×832→384×478,58; Volver x15,36/y34/44×44 tanto en chat como editor. Compositor/Enviar y Descripción/Actualizar dentro del viewport. La captura estable del chat muestra cabecera, botón Volver y compositor; parte de la bienvenida puede quedar desplazada dentro del scroll. No se reprodujo un bloqueo estable que justifique cambiar código.

Una propuesta simulada dentro del arnés; cero escrituras al servidor, erroresJS u orígenes externos inesperados. No se guardó ni actualizó una propuesta. Evidencia privada en `frontend/.local/chat-native-stable-results` del worktree. QA `com.kaptal.app.qa.chat` detenida/desinstalada del usuario0 y ausencia comprobada; forward19323 retirado. Metadatos de `com.kaptal.app` idénticos antes/después:0.1.45/código46, fechas conservadas. No se abrió la app habitual ni se consultaron finanzas reales; no se modificaron permisos o ajustes globales.

## Siguiente paso

CI general/Android cerradas y comprobadas. Se solicitó la revisión del propietario con la comparativa preparada; decisión aún pendiente. Conservar PR275 en borrador hasta la decisión visual. La app habitual0.1.45 conserva el diseño anterior. No hay integración, promoción productiva ni nueva release instalada por este trabajo. Mantener calendario aprobado, historial/lentitud/logout aplazados, chat sin borradores y PR271 excluido.

Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md, docs/CHAT_PANTALLA_NAVEGACION_2026-11-13.md y docs/CI_REVISION_CHAT_PR275_2026-11-13.md. Revalida el head f526c82 del PR275 y continúa la revisión visual del propietario en la comparativa local antes de preparar otra entrega. No repetir las pruebas físicas sin un motivo nuevo».
