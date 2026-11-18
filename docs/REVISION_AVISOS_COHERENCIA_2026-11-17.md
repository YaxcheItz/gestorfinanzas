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

## Comparativa general actualizada

Galería privada nueva: `http://127.0.0.1:14384`. Reúne 24 vistas web y cuatro vistas con Android simulado, en seis modos y antes/después: 336 PNG. Referencia compilada e2b4bf7 (mismo código de producto que PR287/3b14ac6) y actual e205152. Los selectores de sección y versión son independientes; las 336 imágenes cargan, no hay errores JS y la galería se ajusta a 390px. Se conservan las galerías anteriores. Reinicio desde raíz: `python -m http.server 14384 --bind 127.0.0.1 --directory .local/revision-general-20261117`.

Cada versión web recorre 144 estados con API ficticia, fecha fija, red externa/SW bloqueados y cero escrituras, previsualizaciones API o errores JS. No se detecta desborde documental ni hallazgos en el cálculo de contraste de texto visible que cubre el arnés; excluye controles deshabilitados/texto semitransparente y no mide todos los estados posibles. Esta medición corresponde a las 24 vistas web; no se extrapola al puente Android.

Fuera de las dos vistas web de Avisos, 128 de 132 capturas son idénticas byte a byte. Las cuatro diferencias de raster se limitan a rectángulos de 12×51px, 12×42px, 3×50px y 57×33px en captura manual, formulario de categoría y fondo difuminado de rango libre. Se inspeccionaron los cuatro pares completos; las métricas de estilo, controles, títulos, contraste y desborde recopiladas coinciden para los 132 estados. No se afirma identidad total ni se introducen cambios en esas secciones.

Se inspeccionaron muestras de Avisos en claro/oscuro y letra grande, los cuatro pares con diferencias y la galería general de escritorio. Generar/comprobar las 336 imágenes no significa inspeccionar personalmente cada una. La valoración estética del propietario sigue abierta.

Artefactos privados: `.local/avisos-general-before`, `.local/avisos-general-after`, `.local/revision-general-20261117/summary.json`, `metric-differences.json`, `raster-differences.json` y `gallery-check.json`; scripts de captura y comprobación en `frontend/.local/` y generador `.local/build-general-gallery.py`.

## CI propia y continuidad

[PR288](https://github.com/YaxcheItz/gestorfinanzas/pull/288), abierto/borrador, conserva head `e205152a5936f8f4803c977b5c99633d8577663b` publicado y remoto comprobado. CI general 44194248517 completed/failure, con Frontend fallido en security:check por picomatch sin parche publicado. Las unitarias remotas se omitieron por ese fallo; las 580 registradas son locales. Backend, PostgreSQL, Canales y Worker aprobados. E2E Chromium/API/PostgreSQL terminado correctamente: 176 pruebas del proyecto normal y 4 PWA en el proyecto dedicado; las cuatro PWA se omiten solo en el proyecto normal. Arranque y navegación sintéticos aprobados. Android 44194248531 completed/success; sin instalar. Consulta: 2026-11-17 23:10:02 UTC. Diagnóstico y siguiente acción en [CI de dependencias](CI_AVISOS_DEPENDENCIAS_2026-11-17.md). El control de seguridad y las dependencias permanecen intactos.

Cierre documental en rama `revision/avisos-coherencia-pr288`, creada desde develop remoto comprobado y adelantada al head visual solo en esa rama. No cambia el código ni el head del PR. Siguiente: valorar conjuntamente las galerías 14384/14382/14378/14376 y continuar por sección con ajustes demostrados o preferencias concretas. Calendario conservado; historial/lentitud/logout aplazados. Sin integración, instalación, datos reales o despliegue manual.

La primera reconsulta Git del cierre falló por conexión reiniciada y la lectura remota posterior por imposibilidad de conectar a GitHub:443. Los reintentos con HTTP/1.1 completaron fetch y ls-remote; develop/main y el head visual conservaron los SHA registrados. No se descartaron cambios ni se modificó la configuración Git persistente.

Para otro chat: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md, docs/REVISION_AVISOS_COHERENCIA_2026-11-17.md y docs/CI_AVISOS_DEPENDENCIAS_2026-11-17.md. PR288/e205152 conserva el ajuste visual; CI general con fallo de seguridad por picomatch sin parche. Revisa la comparativa 14384 y continúa por sección con datos ficticios. Reconsulta el aviso antes de integrar; no integres PR271 ni despliegues manualmente.»
