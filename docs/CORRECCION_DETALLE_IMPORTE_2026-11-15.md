# Importe y datos del detalle al 200% — 15 noviembre 2026

## Alcance y base

Continúa la revisión de PR284/`3f4d720382936a84cdeecf6c86256a3f1014887f`, por indicación del propietario de seguir. Rama nueva `correcciones/detalle-importe-ampliado`, creada desde origin/develop actualizado y comprobado `fe13575532c8c055fe699374660988a888b01f6f`, adelantada por fast-forward a la revisión documental `13a14bde7dbb0cb52768771e9dbe43f366aeb9f0` únicamente en esta rama. PR284 permanece en su SHA. Main comprobado `1fd9402bb40012aba4c894b81ecceb09dcfb48a1`. PR271 excluido; sin integración, instalación ni despliegue manual.

Se aplican ponytail, debugging-and-error-recovery, angular-developer, ui-ux-pro-max, playwright-cli, ecc-verification-loop y documentation-and-adrs para mantener el cambio concreto, reproducir antes de corregir, comprobar el renderizado y dejar continuidad. Sin dependencias nuevas.

## Cambios comprobados

- En el detalle, la cifra usa el mismo pipe `monto` con dos decimales y sin símbolo repetido; el código de moneda continúa explícito debajo. Se conservan signo, separadores y máscara de privacidad. La tipografía en rem se duplica realmente al 200%: 20→40 px en 320 px de ancho, y 24→48 px en anchos superiores. El padding horizontal fijo evita duplicar también el espacio que resta ancho al importe. No se usa elipsis ni se recortan decimales.
- El importe deja de admitir cortes en cualquier carácter. Los datos del detalle usan columnas que se apilan cuando el ancho disponible no permite mantener palabras completas. La prueba también desplaza la cuenta ficticia y comprueba que quede entre encabezado y acciones, sin estar tapada.
- El pie de la tarjeta de presupuesto permite salto de fila y añade separación entre «Del límite mensual» y el porcentaje. No cambia el cálculo.
- `check-startup.cjs` mantiene todas sus aserciones. Si falla, su mensaje ahora incluye el escenario, la ruta y si la cabecera estaba ausente, vencida o era inesperada. No imprime tokens. No se cambian AuthService, interceptores, logout o lógica de sesión.

## Evidencia local

Los dos nuevos casos del detalle reproducen **tres líneas** sobre el artefacto anterior en ambos temas. Tras corregir el importe, la comprobación de palabras completas reproduce también el problema de las columnas. Una primera iteración del selector coincidía con dos listas de datos; se corrigió el arnés y la reproducción válida posterior falló por el corte de palabras. Ese error del selector no se atribuye al producto.

Pruebas nuevas: gasto, ingreso, transferencia y saldo inicial, en 320/100%, 320/200%, 390/100% y 1280/100%, claro y oscuro; cifra grande `9,876,543.21`, cero, signo, moneda explícita, decimales, máscara, ausencia de desborde, palabras completas y aumento real al doble. Dos casos adicionales de privacidad mediante perfil ficticio. No hay escrituras ni errores JS. Los dos casos se repitieron después de añadir la verificación de desplazamiento y aprobaron en 31,6 s.

Comprobaciones:

- 580 unitarias en 66 archivos aprobadas. Sin medición nueva de cobertura.
- 10 E2E focales aprobadas en 39,3 s, incluidos los dos nuevos casos; los ocho previos conservan calendario, historial, cifras/chat y contraste. La verificación posterior del scroll vuelve a aprobar los dos casos modificados.
- 19 E2E de regresión de secciones, teclado, formularios y captura aprobadas en 3,1 min. Son 29 casos distintos entre ambas baterías, no 31 por contar las repeticiones.
- TypeScript de la aplicación y comprobación estricta del archivo E2E sin errores; build de producción 489,19 kB aprobado. Permanecen los tres avisos CSS previos de Login/Avisos/automatic-bank.
- Auditoría nueva de 144 estados en 1,6 min: cero desbordes del documento y cero fallos de contraste visibles medidos. La continuidad de la cifra se acredita por los focales nuevos, no por esa métrica de desborde.
- El comprobador de arranque aprobó siete ejecuciones con el artefacto previo y otra con el artefacto final y diagnóstico ampliado. Cada ejecución recorre 200/401/503 con respuestas ficticias y refresh retenido; no reproduce el fallo remoto y no demuestra su causa.

Comparativa nueva: http://127.0.0.1:14372, PR284 frente a esta corrección, con las mismas 24 vistas/seis configuraciones y 288 imágenes. La 14368 permanece intacta. API ficticia, contextos nuevos, red externa y service worker bloqueados para la auditoría visual; fecha fija y animaciones terminadas antes de capturar. El servidor está limitado a loopback. Reinicio: `python -m http.server 14372 --bind 127.0.0.1 --directory .local/revision-detalle-importe-ampliado`.

Evidencia privada en el frontend del worktree: `.local/detalle-red`, `.local/meta-red-comprobado`, `.local/focal-final`, `.local/detalle-scroll-final`, `.local/regresion-final`, `.local/auditoria-final`, `.local/unitarias.log`, `.local/build-final.log`, `.local/startup-six.log`, `.local/startup-final.log` y `.local/types-e2e-final.log`. Los PNG permiten revisar también el ingreso grande y los datos tras desplazar el detalle.

## CI de PR284 y límite pendiente

[Android 43767153323](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/43767153323) aprobó. El primer intento de [CI general 43767153271](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/43767153271) terminó con fallo: cinco jobs aprobados; el job E2E completó 164 casos y omitió cuatro reservados al proyecto PWA. Después falló `check-startup.cjs` con dos solicitudes que no coincidían con la cabecera esperada, antes de comenzar los casos PWA dedicados. No es correcto afirmar que la batería PWA de ese intento aprobó o que fallaron sus casos.

Se solicitó reintentar los jobs fallidos por la herramienta GitHub. El reintento está en curso al preparar esta publicación; registrar su resultado y la CI del nuevo SHA tras publicar. Los pases locales no convierten ese fallo remoto en aprobado ni acreditan que se haya corregido una causa de autenticación. No se silencia ni se omite el control.

## Continuidad

Siguiente: consultar la CI del SHA de esta corrección y el reintento de PR284, revisar detalle y pie del presupuesto en comparativa14372 y continuar únicamente con los ajustes demostrados. La densidad del historial y el desplazamiento del calendario siguen para valoración estética del propietario. PR271 excluido; lentitud/logout aplazados. Sin finanzas reales, integración, instalación o despliegue manual. La conexión existente de Vercel puede generar una Preview automática al abrir el PR; no se cambia hosting.

Para otro chat: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md, docs/REVISION_PR284_COMPARATIVA14368_2026-11-15.md y docs/CORRECCION_DETALLE_IMPORTE_2026-11-15.md. Continúa desde correcciones/detalle-importe-ampliado: revalida SHA/CI y revisa comparativa14372 con datos ficticios. Conserva PR271 excluido y no despliegues manualmente».


## Publicación y CI comprobadas — 15 noviembre 2026, 22:39 UTC

PR285 borrador hacia develop: https://github.com/YaxcheItz/gestorfinanzas/pull/285 . Commit de código y evidencia local `2b0fe058424fb5a26d1ff9608a06d080a66c0bbd`, publicado con SHA remoto idéntico. El cierre documental posterior mantiene el mismo código; comprobar el head final del PR para su propia CI. Rama correcciones/detalle-importe-ampliado; comparativa14372 comprobada con288 imágenes/selectores/ancho390px y cero errores JS.14368 conservada.

Reintento de PR284/3f4d720: CI general43767153271 completed/success y Android43767153323 completed/success reconsultadas. Log del job132980684597:164 casos en11,9min, cuatro reservados a PWA omitidos en el proyecto normal y los cuatro PWA dedicados aprobados después en16,8s. check-startup pasó200/401/503 con cero solicitudes protegidas antes del refresh y cero cabeceras inesperadas. Se conserva el primer fallo; el reintento no demuestra su causa ni una corrección de autenticación.

CI iniciada para2b0fe05: general43770362555 y Android43770362553 en curso al registrar. No se atribuye al nuevo SHA la CI aprobada de PR284. El cierre documental genera otro head con código idéntico: verificar su CI exacta. Desarrollo/main y PR284 conservan sus SHA; PR271 excluido, sin integración, instalación o despliegue manual. La configuración de hosting no se cambió; una Preview automática de la conexión existente no constituye un despliegue manual.

Siguiente: comprobar CI del head final de PR285 y valorar el detalle/Presupuestos en comparativa14372. Si reaparece el fallo de check-startup, usar su diagnóstico nuevo sin desactivar las aserciones. Para continuar, leer AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/CORRECCION_DETALLE_IMPORTE_2026-11-15.md; conservar datos ficticios, PR271 excluido y ningún despliegue manual.
