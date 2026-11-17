# Valoración por sección: Inicio, Pareja y Cuentas

17 noviembre 2026, 23:36 UTC. Comparativa privada: http://127.0.0.1:14384.

## Base comprobada

Rama `revision/valoracion-14384-inicio-cuentas`, creada desde `origin/develop` después de fetch y comprobación remota: `fe13575532c8c055fe699374660988a888b01f6f`. Fast-forward de `dc974d6017bdb4e3335c701139621bf6625e85e3` solo en esta rama para conservar la propuesta visual y sus documentos. Remoto comprobado: main `1fd9402bb40012aba4c894b81ecceb09dcfb48a1`, rama visual de PR288 `e205152a5936f8f4803c977b5c99633d8577663b` y cierre documental `dc974d6`. No se integran ramas de producto ni PR271; no se despliega ni instala.

## Inspección y valoración

Inspección directa de 18 PNG actuales: Inicio, Gastos en pareja y Mis cuentas, cada uno en 390/100%, 1280/100% y 320/200%, claro y oscuro. Se leyeron los cinco documentos solicitados, priorizando los resúmenes vigentes de estado y plan frente a su historial. Datos ficticios de los artefactos existentes; ninguna consulta a cuentas o avisos reales.

| Sección | Valoración de la muestra | Decisión |
| --- | --- | --- |
| Inicio | El gasto del periodo domina correctamente sobre ingresos y saldo. En oscuro se conserva la jerarquía aunque desaparece la diferenciación verde de ingresos. Los botones flotantes coinciden visualmente con Recientes en móvil y con Presupuestos al 200%; en escritorio también quedan cerca del encabezado de Recientes. Los nombres de categoría/movimiento aparecen abreviados. | Mantener la presentación. Prioridad para una comprobación interactiva: desplazamiento y acceso a filas bajo los botones flotantes. La captura completa de una página con elementos fijos no demuestra una obstrucción permanente ni justifica por sí sola cambiar CSS. |
| Gastos en pareja | Fondo común, participantes y acciones están separados. En escritorio las tres acciones comparten fila; en móvil se apilan. Al 200% crece mucho la longitud, pero las palabras, importes y acciones de la muestra siguen legibles; el estado sin pagos se entiende. | Sin ajuste demostrado en estas seis capturas. No se ejercitan aportes, pagos, borrado ni desvinculación. |
| Mis cuentas | Saldo, moneda y acceso a transacciones conservan jerarquía. Al 200% las pestañas y tarjetas se apilan, con nombres completos y cifras legibles. En escritorio las tarjetas tienen bastante espacio vertical. | Conservar; reducir espacio sería una preferencia estética, no una corrección demostrada. Administración está cerrada: su contenido y formulario siguen sin inspección en esta parte. |

Los 18 pares antes/actual son idénticos por SHA256: las observaciones anteriores son preexistentes, no regresiones del ajuste de Avisos. Manifiesto privado: `.local/revision-general-20261117/valoracion-inicio-pareja-cuentas.json`, con nombres, modos y hashes. Se inspeccionaron los 18 PNG actuales; no se afirma haber inspeccionado los 336 de la galería.

## Comprobaciones y límites

Se ejecutó nuevamente `node .local/check-general-gallery.cjs` desde frontend: 336 imágenes decodificadas, 28 secciones, seis modos, selectores independientes, sin desborde de la galería a390px y sin errores JS. Resultado privado: `.local/revision-general-20261117/gallery-check.json`. Esto verifica la galería estática; no vuelve a medir el desborde/contraste de la aplicación ni valida sus interacciones.

Skills: `playwright-cli` para verificación de navegador aislado, con el arnés Playwright local ya existente; `web-design-guidelines` como referencia de legibilidad y contenido, consultada en su fuente oficial https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md. No se declara una auditoría de código conforme a todas esas reglas.

Sin cambios de producto o dependencias: no se repiten build, unitarias ni E2E del producto. CI y estado de picomatch son los antecedentes documentados en `CI_AVISOS_DEPENDENCIAS_2026-11-17.md`, no reconsultados aquí. No se atribuye CI nueva a esta rama documental. El primer fetch y la consulta de remoto fallaron dentro del entorno restringido; el reintento autorizado completó ambos sin cambiar configuración Git.

## Continuidad

Siguiente parte: reproducir con API ficticia la superposición de Inicio a390/100% y320/200%, antes y después de desplazar, incluyendo acceso a Recientes y sus acciones. Solo ajustar si se confirma una obstrucción o existe preferencia concreta. Después revisar formulario de cuenta y Presupuestos en los seis modos de14384. Calendario conservado; historial/lentitud/logout aplazados. La aceptación estética del propietario permanece abierta.

Para otro chat: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/VALORACION_14384_INICIO_PAREJA_CUENTAS_2026-11-17.md. Continúa desde revision/valoracion-14384-inicio-cuentas: comprueba interactivamente Inicio con datos ficticios antes de modificar los botones flotantes; después revisa formulario de cuenta y Presupuestos en14384. No integres PR271 ni despliegues manualmente».
