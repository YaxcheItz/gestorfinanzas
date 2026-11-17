# Avisos: jerarquía y espacio de edición — 17 noviembre 2026

## Base y alcance

Continúa la revisión por sección tras Metas. Rama nueva `mejoras/avisos-coherencia-visual`, creada desde origin/develop actualizado/comprobado `fe13575532c8c055fe699374660988a888b01f6f` y adelantada por fast-forward a la revisión documental `e2b4bf7d1057a1c2e52ca59fb0490d393b4556ea` solo en esta rama. PR287 conserva head `3b14ac65ea9b89d5f802fb8835b0032db19e33a0`, abierto/borrador, con CI general44016506925 y Android44016506845 completed/success reconsultadas. Main conserva `1fd9402bb40012aba4c894b81ecceb09dcfb48a1`.

Se revisan Avisos, Bancos y cuentas, Añadir aviso y el editor de asociaciones. API y puente Android ficticios en contextos nuevos; no se usan sesiones habituales, avisos reales ni configuraciones del teléfono. PR271 excluido; sin integración, instalación o despliegue manual.

## Hallazgos y cambios concretos

| Vista | Hallazgo y ajuste |
| --- | --- |
| Avisos | El título usaba una escala propia:24px a320px y30,4px en escritorio, frente a22/28px de las demás páginas financieras. Se reutiliza `finance-page` y su escala22/24/28px según ancho. Se conservan padding lateral16/20px y el aumento real al doble. |
| Encabezados de avisos y formularios | En claro tenían peso400 frente a700 en las secciones de referencia. Se refuerzan los encabezados, conservando el peso600 previsto por el tema oscuro. No se cambian colores, importes ni acciones. |
| Bancos y cuentas | El padding horizontal en rem crecía junto con la letra y estrechaba el contenido. Se conserva en píxeles el mismo espacio normal:20px en el panel y16px en móvil estrecho/editor. El padding vertical sigue ampliándose. |
| Editor de asociaciones | «Cancelar» se partía en dos líneas a320/200%, en ambos temas. Una aserción adicional detectó que «asociación» aún se partía en oscuro. El padding lateral fijo de16px en los controles compartidos deja espacio para ambas palabras, manteniendo la fuente16→32px y los saltos entre palabras. |

El ajuste afecta solo a una clase de presentación y cinco hojas CSS del ámbito de Avisos/controles bancarios. No cambia TypeScript del producto, servicios, parsers, reglas, asociaciones, consentimientos, credenciales, almacenamiento ni lógica financiera. Guardar asociación continúa deshabilitado sin consentimiento. Las pruebas abren/cancelan altas y ediciones sin guardar.

Skills aplicadas: redesign-existing-projects para inspección previa; ponytail para cambios mínimos; angular-developer para estilos encapsulados y reglas compartidas; debugging-and-error-recovery para reproducción y cascada CSS; playwright-cli y ecc-verification-loop para comprobación.

## Evidencia y comprobaciones

- Cuatro casos nuevos reprodujeron diferencias en el artefacto anterior: dos de jerarquía y dos del corte de «Cancelar». Se conservan los registros. El primer arnés esperaba700 también en oscuro; se corrigió esa expectativa conforme al tema existente600, y la reproducción definitiva sigue fallando por la escala del título en oscuro. No se presenta ese ajuste del arnés como defecto del producto.
- Una verificación intermedia encontró que el selector local del encabezado del teléfono anulaba el peso oscuro. Se corrigió la especificidad y se conservó el contrato del tema. La aserción adicional de «asociación» detectó el espacio residual insuficiente del botón, corregido en la hoja compartida.
- Nueve E2E finales aprobados: cuatro nuevos y cinco existentes. Los nuevos recorren320/100%,320/200%,390/100%,390/200%,1280/100% y1280/200%, en claro/oscuro. Verifican escala/peso, padding conservado, campos al doble, Escape/foco, navegación entre paneles, alta/edición/cancelación, palabras completas y ausencia de desborde. Guardar permanece deshabilitado y se comprueban cero escrituras API y cero llamadas de configuración/reintento/descarte nativo.
- 580 unitarias/66 archivos, TypeScript de aplicación y comprobación estricta del E2E/configuración aprobados. Build de producción489,19kB iniciales. Siguen los tres avisos CSS existentes; Avisos pasa de4,53 a4,55kB y automatic-bank de5,02 a5,05kB. No se elevan presupuestos. No hay tarea lint configurada.
- Matriz nueva: cuatro vistas × seis modos × antes/después =48 PNG, con misma API/puente ficticios y fecha fija. Capturas completas del editor para evitar confundir la barra sticky de una captura recortada con un defecto. La base se compiló en worktree separado `.local/worktrees/avisos-baseline`, head e2b4bf7, con código idéntico al PR287 y dependencias ya instaladas enlazadas. Red externa/SW bloqueados; cero escrituras y errores JS. La métrica de desborde cubre el documento; las palabras de botones tienen aserciones propias. No se declara una nueva auditoría global de contraste.

Comparativa privada: `http://127.0.0.1:14382`. Carga de48 imágenes, cuatro secciones, seis modos y ancho390px comprobados. Se conservan14378/14376/14372. Reinicio desde la raíz: `python -m http.server 14382 --bind 127.0.0.1 --directory .local/revision-avisos-coherencia`.

Evidencia privada: `.local/avisos-coherencia-red-confirmed`, `.local/avisos-editor-red`, `.local/avisos-editor-save-red`, `.local/avisos-coherencia-entrega`, `.local/avisos-unitarias-final.log`, `.local/avisos-build-final.log`, `.local/avisos-capture-before-final`, `.local/avisos-capture-after-final` y `.local/revision-avisos-coherencia`. Reproducción focal desde `frontend`: `npx --no-install playwright test -c playwright.avisos-coherencia.config.ts`.

## Continuidad

El cambio nuevo necesita su propia CI por SHA al publicar; no se le atribuyen los resultados aprobados de PR287. Siguiente: valorar conjuntamente Avisos14382, Metas14378 y Reportes14376 y continuar únicamente con ajustes demostrados o preferencias concretas del propietario. Calendario conservado; historial/lentitud/logout aplazados. La matriz sintética no equivale a aceptación estética ni prueba física.

Para otro chat: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/REVISION_AVISOS_COHERENCIA_2026-11-17.md. Comprueba el SHA y CI publicados de mejoras/avisos-coherencia-visual, revisa comparativa14382 y continúa por sección con datos ficticios y cambios concretos. No integres PR271 ni despliegues manualmente.»
