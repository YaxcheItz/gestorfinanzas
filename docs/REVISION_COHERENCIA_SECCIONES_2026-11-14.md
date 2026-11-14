# Coherencia entre secciones — 14 noviembre 2026

## Base y alcance

Continuación autorizada después de Ajustes. Se comprobó origin/develop fe13575532c8c055fe699374660988a888b01f6f y se creó auditoria/coherencia-visual-secciones desde esa base, incorporando 8448633ac0861762b1122b82f4d2e00b40b9f3ad/PR281 por fast-forward. CI general 43628292178 y Android 43628292170 de esa dependencia reconsultadas con resultado exitoso. El primer fallo intermitente de check-startup.cjs de PR281 permanece documentado; el reintento exitoso no demuestra una corrección de sesiones o logout.

Worktree .local/worktrees/coherencia-visual-secciones. Se mantienen las skills de revisión de interfaz renderizada, ui-ux-pro-max, ponytail, playwright-cli y ecc-verification-loop. Sin nuevas dependencias, API, reglas financieras, persistencia o cambios de autenticación. Calendario aprobado e historial conservado como referencia; no se integra PR271. Lentitud/logout continúan aplazados.

## Hallazgos presentados y correcciones

| Sección | Evidencia anterior | Cambio mínimo |
|---|---|---|
| Cuentas, Presupuestos, Categorías, Etiquetas, Compartidos y Ajustes | La regla común fija h1 en 30px incluso con fuente raíz al 200%. | 1,875rem: conserva 30px al 100% y crece a 60px al 200%; admite palabras largas. Se excluye history-page. |
| Inicio | Selector de moneda de 11px/32px de alto, enlaces de 13px y títulos de 20px permanecen fijos al 200%. | Equivalentes rem, selector de al menos 44px y fila de encabezado que puede apilarse. No cambia el calendario ni el selector de periodo. |
| Categorías | Nombre ficticio largo truncado; ancho de texto 558px frente a 230px disponibles a 320/200% oscuro. | El nombre completo envuelve; se conservan botones y handlers. |
| Metas | Palabra larga de la nota inferior necesita 273px frente a 256px disponibles a 320/200% oscuro. | La explicación completa permite dividir palabras cuando hace falta. |
| Compartidos, tema claro | Aporte +MX$100 con emerald-600 sobre blanco: 3,768:1 para texto normal de 14px. | Token de ingreso del tema con contraste medido >=4,5:1; en oscuro conserva el token ya legible. |
| Presupuestos | El carácter separador de periodo entra como texto de bajo contraste en la medición. | Se marca aria-hidden porque es decorativo; presentación idéntica. |

## Comparativa y límites

20 vistas: Inicio, Movimientos de referencia, Cuentas, Presupuestos, Categorías, Etiquetas, Reportes, Metas, Compartidos, Avisos, Ajustes, chat, captura manual, formularios de cuenta/presupuesto/categoría/aporte/aviso, edición local de etiqueta y perfil. Seis configuraciones: 390/100%, 1280/100% y 320/200%, cada una en claro y oscuro. Son 120 estados por versión y 240 imágenes.

Los doce tokens comprobados son idénticos entre las vistas de cada tema. La tipografía calculada también es coherente por tema: Manrope en oscuro y la familia de sistema existente en claro. El fondo oscuro es rgb(21,23,25). Se mantienen las diferencias de jerarquía entre Reportes, Metas y Avisos; coherencia no implica que todo use el mismo tamaño.

Las 120 vistas finales no tienen desborde horizontal del documento ni fallos de contraste en el texto visible medido. Esto no afirma que no exista ningún recorte: las filas de movimientos de Inicio/Historial y entry-summary conservan elipsis intencionadas, y la selección del icono de categoría produce una medición de 4/8px por la marca de esquina visible. Se inspeccionó la captura para distinguir ese marcador de una pérdida de texto. El resumen de captura conserva los campos completos debajo. Los importes/enlaces de tarjetas pueden envolver en espacios estrechos al 200%, como en la etapa previa; no se toma esta auditoría como aprobación estética final.

La auditoría y los focales usan API interceptada, datos inventados, contexto nuevo, service worker bloqueado y red externa bloqueada. Se comprueban cero escrituras, cero previsualizaciones y cero errores JS. Abrir diálogos y rellenar la etiqueta no envía formularios. No se consultan finanzas reales, credenciales, avisos del teléfono ni se modifican permisos.

Galería local: http://127.0.0.1:14359 . Permite elegir dos secciones y ambas versiones de forma independiente. Carga de 240 imágenes, selectores, seis modos y geometría a 390px comprobados en Chromium aislado, sin errores JS. Artefactos privados en .local/revision-coherencia-secciones; reinicio documentado en su README. No se suben imágenes ni perfiles.

## Verificación

Diez regresiones focales prueban tamaño calculado, geometría real, texto sin recorte y contraste. Nueve fallan sobre el artefacto anterior 8448633 servido desde el worktree de Ajustes, y la referencia de Movimientos pasa. Esta base es inmutable e independiente del build nuevo. La versión inicial agrupaba los seis títulos en un solo caso: cuatro defectos fallaban y la referencia pasaba; se dividió por sección para limitar la duración de cada caso sin ampliar timeouts. Una ejecución integral intermedia se detuvo al dividir esa prueba y no acredita la versión final.

579 pruebas unitarias en 66 archivos aprobadas. TypeScript estricto de los nuevos fixtures y pruebas aprobado. Build de producción 488,72kB dentro del límite 500kB; permanecen los avisos CSS anteriores de Login, Avisos y automatic-bank. La auditoría de capturas final pasó en 1,7min; los cinco focales iniciales pasaron en 45,3s. El cierre registra el resultado integral de la división final y la CI exacta.

Evidencia local: frontend/.local/coherencia-base y coherencia-after (audit.json +120 PNG cada uno), coherencia-baseline-final/coherencia-baseline-split (artefacto anterior), coherencia-regresion-after, coherencia-integral-final, unitarias.log, build-after.log, types-final.log y gallery-check.json. No confundir esta API simulada con E2E de CI/PostgreSQL o las pruebas PWA con service worker real.

## Continuidad

Publicar la rama y PR borrador hacia develop, verificar SHA remoto y CI. Los resultados posteriores se registran en checkout principal, planes locales y PR para mantener la CI del código final. Sin integración, producción o instalación. Siguiente paso: valorar la comparativa conjunta y concretar los ajustes que el propietario quiera antes de integrar las ramas.

Para otro chat: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/REVISION_COHERENCIA_SECCIONES_2026-11-14.md. Revalida SHA/CI de auditoria/coherencia-visual-secciones y revisa la comparativa 14359. Continúa con ajustes visuales concretos usando datos ficticios, conservando calendario/historial y sin integrar PR271 ni desplegar».


## Publicación de coherencia entre secciones / PR282 — 14 noviembre 2026

Rama auditoria/coherencia-visual-secciones publicada, SHA d52f3fc91b9a837cbc5c917a2e54bda597abc5bd remoto comprobado y worktree limpio. PR282 borrador: https://github.com/YaxcheItz/gestorfinanzas/pull/282 . Local: 89/89 E2E en 8,6min, 579 unitarias/66 archivos, TypeScript estricto, build 488,72kB y cuatro PWA con service worker real/backend H2 en memoria en 1,9min aprobados. Nueve regresiones reproducen defectos en el artefacto inmutable 8448633 y la referencia de Movimientos pasa antes/después.

CI general 43637651542: frontend, backend, PostgreSQL/migraciones/recuperación, WhatsApp/D1 y Python exitosos; E2E/API/PostgreSQL/PWA aún en curso al registrar. Android 43637651540 completed/success. Falta registrar el resultado remoto exacto del trabajo E2E, sin anticiparlo. El log frontend 132577906327 confirma 579 unitarias/66 archivos. PR mergeable y borrador; esto no autoriza integración o despliegue.

Comparativa local http://127.0.0.1:14359 con 240 imágenes,20 vistas y seis modos, carga/selectores/ancho390 comprobados. Auditoría/focales ficticios con cero escrituras/previsualizaciones/errores JS. Tokens por tema coherentes y vistas finales sin desbordes o fallos de contraste medidos; elipsis intencionadas conservadas. Ver docs/REVISION_COHERENCIA_SECCIONES_2026-11-14.md. Siguiente inmediato: comprobar CI del SHA final y cerrar la documentación; después valorar la comparativa conjunta. Sin datos reales, teléfono, integración o instalación. Develop fe13575 y main1fd9402 reconsultados sin cambios.
