# Revisión de PR284 y comparativa14368 — 15 noviembre 2026

## Resultado

Revisión de `3f4d720382936a84cdeecf6c86256a3f1014887f`, sin modificar código. PR284 continúa abierto y en borrador hacia develop. Hay una mejora visible en calendario, historial, cifras y chat, pero el detalle del movimiento conserva un defecto de lectura al 200%. La revisión no constituye aprobación estética del propietario ni autorización para integrar.

Rama documental nueva `revision/pr284-comparativa14368`, creada desde origin/develop actualizado y comprobado `fe13575532c8c055fe699374660988a888b01f6f`, y adelantada por fast-forward a PR284 únicamente en esta rama. La propuesta original permanece en su SHA. Main remoto comprobado `1fd9402bb40012aba4c894b81ecceb09dcfb48a1`. PR271 sigue abierto, borrador y sin integrar. Sin instalación ni despliegue manual.

## CI consultada por el SHA exacto

- [Android APK 43767153323](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/43767153323): completed/success.
- [CI general 43767153271](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/43767153271): en curso en la consulta inicial de esta revisión. Frontend, backend, canales, Worker y PostgreSQL aprobados; E2E Chromium/API/PostgreSQL todavía ejecutando los flujos con API de test. No se declara CI general aprobada. Consultar el cierre de esta sección para la última comprobación.

Última consulta de los runs en esta revisión: 15 noviembre 2026, 22:17 UTC (16:17 de Ciudad de México). Android completed/success; CI general in_progress, sin conclusión todavía. El job E2E seguía en «Flujos con API real» en la consulta de sus pasos, sin fallo reportado; PWA y navegación sintética aún pendientes. El intento de obtener logs del job en curso devolvió BlobNotFound/404 y no aporta evidencia de éxito o fallo. Snapshot privado: `.local/revision-pr284-14368/ci-snapshot.json`. No se canceló ni reintentó el workflow.

Los resultados locales previos (580 unitarias/66 archivos, 101 E2E y siete funcionales/PWA con H2) permanecen como evidencia de la etapa anterior; no se ejecutaron nuevamente en esta revisión documental. Android CI no acredita instalación ni uso real del teléfono.

## Hallazgos por sección

| Sección | Evidencia y valoración | Acción siguiente |
|---|---|---|
| Detalle del movimiento | **Prioridad alta:** a 320 px y texto al 200%, `−MX$125.40` se divide en tres líneas en claro y oscuro, separando los centavos. Está presente tanto en PR283 como en PR284: pendiente preexistente, no regresión atribuible a PR284. A 390/100% y escritorio se lee completo. | Corregir el reflujo de esta cifra en una etapa posterior, conservando tamaño ampliado, signo, decimales y privacidad. Añadir un caso que compruebe la continuidad visual del importe a 320/200% en ambos temas; el desborde del documento por sí solo no lo detecta. |
| Calendario | Una etiqueta por mes, selección clara y menor ruido visual. A 320/200% las pestañas se apilan y los meses inferiores quedan bajo el área visible inicial. | Valorar con el propietario el desplazamiento necesario. Una captura inicial no demuestra que falten meses; la operabilidad del scroll corresponde a las pruebas previas. |
| Frecuencias y rango libre | Etiquetas y fechas legibles en las capturas focales; rango libre conserva los dos campos y su acción. Frecuencias ampliadas necesita recorrido vertical. | Mantener el reflujo; no confundir contenido bajo el pliegue con recorte definitivo. |
| Historial | Descripción y cuenta ganan espacio; el importe tiene su fila y los tipos quedan visibles al 200%. En escritorio aumenta la distancia entre descripción e importe y cada movimiento ocupa más alto. | Valorar la densidad por sección antes de compactar. No reducir el aumento de texto. El placeholder del buscador sigue acortado al 200%; no se ha demostrado pérdida del valor introducido. |
| Cuentas | El saldo de ejemplo `198,765.43` y `125.00` permanece completo al 200%, donde antes se separaban los decimales. La moneda figura en la etiqueta. | Conservar esta mejora y la máscara de privacidad. No generalizarla al detalle del movimiento. |
| Presupuestos | `1,500.00` ya no se parte y el título cabe. **Observación menor:** al final de la tarjeta a 320/200% queda muy junto el texto «Del límite mensual» y «25%». | Considerar separación o apilado en ese pie al ajustar esta sección; no se registra como error de cálculo. |
| Chat | El campo ampliado muestra varias palabras por línea, frente al texto estrechado anterior. En escritorio conserva su composición. | Mantener; no se escribió ni envió texto ni se accedió a una conversación real. |

Evidencia directa, siempre con datos ficticios:

- [Detalle propuesto, claro, 320/200%](http://127.0.0.1:14368/images/after-detalle-movimiento-320-200-light.png) y [base clara](http://127.0.0.1:14368/images/before-detalle-movimiento-320-200-light.png).
- [Detalle propuesto, oscuro, 320/200%](http://127.0.0.1:14368/images/after-detalle-movimiento-320-200-dark.png) y [base oscura](http://127.0.0.1:14368/images/before-detalle-movimiento-320-200-dark.png).
- [Presupuesto, claro, 320/200%](http://127.0.0.1:14368/images/after-presupuestos-320-200-light.png).
- [Galería comparativa](http://127.0.0.1:14368), con las etapas anteriores conservadas.

## Alcance de la comprobación actual

Inspección visual directa de 28 PNG focales guardados, correspondientes a ocho superficies (meses, frecuencias, rango libre, historial, detalle, cuentas, presupuestos y chat). Incluye ambos temas, móvil 390/100%, escritorio 1280/100% y 320/200% en la selección; no significa inspección visual individual de las 288 imágenes ni de cada combinación de cada sección.

Comprobación nueva de las **288 imágenes** por HTTP local: decodificadas, ancho correcto e igualdad byte a byte con la captura fuente de cada auditoría. Son 24 vistas y seis modos para dos versiones. La página devuelve HTTP 200 y declara explícitamente sus datos ficticios. Evidencia privada `.local/revision-pr284-14368/asset-check.json`; reproducción `python .local/review-pr284-assets.py`.

Las métricas guardadas de la auditoría anterior contienen 144 estados propuestos, cero desbordes del documento y cero fallos de contraste medidos. Esas mediciones no se repitieron en esta revisión y no acreditan que un importe no se divida en varias líneas. El defecto visual del detalle explica por qué no debe presentarse esta propuesta como completamente validada al 200%.

El host del navegador integrado no estaba disponible y la ventana nativa de revisión seleccionada estaba minimizada; no se llegó a inspeccionar la galería mediante esa interfaz. Se usaron las capturas renderizadas originales y peticiones HTTP estáticas. No se repitieron los controles interactivos de la galería ni gestos/foco de la aplicación. Ninguna petición nueva fue a la API financiera, y no hubo escritura, autenticación, envío de chat ni acceso a datos reales.

## Continuidad

Siguiente etapa: resolver el importe del detalle al 200% con un caso focal que reproduzca el hallazgo, y revisar el espacio del pie de presupuesto si corresponde. Valorar con el propietario densidad del historial y desplazamiento del calendario. Cualquier implementación debe partir de una rama nueva desde develop remoto comprobado y conservar la dependencia de PR284. PR271 excluido; lentitud/logout siguen aplazados. Integración solo cuando se autorice; ningún despliegue manual.

Para otro chat: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md, docs/DISENO_CALENDARIO_HISTORIAL_2026-11-15.md y docs/REVISION_PR284_COMPARATIVA14368_2026-11-15.md. Continúa PR284/3f4d720: confirma su CI y atiende el importe partido en Detalle a 320/200% con datos ficticios, conservando decimales, signo, privacidad y ampliación. No integres PR271 ni despliegues manualmente».


## Seguimiento: corrección propuesta del detalle

El hallazgo sobre3f4d720 permanece como evidencia histórica. La propuesta posterior está en correcciones/detalle-importe-ampliado y comparativa14372; ver docs/CORRECCION_DETALLE_IMPORTE_2026-11-15.md. Reproduce y corrige el importe partido y las columnas estrechas, además del espacio del pie del presupuesto. CI general de PR284 terminó con fallo en check-startup antes de PWA; se solicitó reintento. No atribuir los pases locales de la corrección a CI ni a finanzas reales.
