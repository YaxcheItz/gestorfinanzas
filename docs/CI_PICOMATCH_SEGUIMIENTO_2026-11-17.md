# Picomatch: seguimiento de CI y reproducción aislada

17 noviembre 2026, hora de México; comprobaciones del 18 noviembre UTC.

## Base y alcance

Checkout inicial limpio `correcciones/seguridad-picomatch-pr288`, `25defa866c230a1e256e1a7fb413537e59eede8e`, coincidente con el remoto. Fetch y ls-remote vuelven a confirmar develop `fe13575532c8c055fe699374660988a888b01f6f`, main `1fd9402bb40012aba4c894b81ecceb09dcfb48a1` y PR288 `e205152a5936f8f4803c977b5c99633d8577663b`.

Rama documental nueva `revision/cierre-ci-picomatch-pr288`, creada desde origin/develop comprobado y adelantada por fast-forward a 25defa8 solo en esta rama. Conserva la cadena visual y documental. Sin cambios de producto, dependencias, control de seguridad o workflows. Se mantienen las conclusiones del [diagnóstico anterior](SEGURIDAD_PICOMATCH_PR288_2026-11-17.md).

Skills: `debugging-and-error-recovery`, `ponytail` y `ecc-verification-loop`. Se usa GitHub para metadatos/jobs/logs, y CLI para eventos push y consultas públicas del repositorio upstream. No se instalan ni ejecutan fuentes de los PR candidatos.

## Reconsulta y propuestas todavía pendientes

El [aviso oficial GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) sigue señalando `<=4.0.7`, sin versión corregida. El registro npm continúa en `latest: 4.0.7`, sin otro dist-tag ni versión posterior. No se ha retirado oficialmente la alerta consultada. Comentarios particulares sobre su severidad o exposición no cambian el resultado de la auditoría del proyecto ni se usan para ampliar excepciones.

Se amplió la consulta más allá del PR194:

| Propuesta upstream | Evidencia consultada y límite |
| --- | --- |
| [PR238](https://github.com/micromatch/picomatch/pull/238), head `44f192261f312ddf236cb7bdc05d8f22663f98f9` | Abierto/sin fusionar. Su descripción conserva el caso de comodín único `+(*)`; una revisión en comentarios señala que también es lento. No resuelve todos los ejemplos del aviso. |
| [PR264 para master/4.x](https://github.com/micromatch/picomatch/pull/264), head `8144a1a22a8fa1766951411f220cc8c6228cb041` | Abierto/sin fusionar: 818 adiciones y 6 borrados en dos archivos; 588 adiciones del parser y 230 de pruebas. En la consulta, cero check-runs y cero revisiones publicadas para ese head. Incluye reescrituras y alternativas que se vuelven literales; el autor declara límites en otras formas de ambigüedad. Sus resultados declarados no se presentan como pruebas ejecutadas aquí. |
| [PR265 para v2](https://github.com/micromatch/picomatch/pull/265), head `dda1c43a8e9cae36ffb0407127ee64e17fbc1c2c` | Backport de PR264, abierto/sin fusionar: 829 adiciones y 6 borrados en dos archivos; cero check-runs devueltos para ese head. Haría falta validar también esta línea, usada por Tailwind/micromatch/chokidar. |
| [PR266](https://github.com/micromatch/picomatch/pull/266), head `cad55d062b063e559913b6b0b368d7bb96c33f42` | Abierto/sin fusionar. El autor declara que no trata ramas múltiples, no incluye backport v2 y convierte algunas formas antes válidas en texto literal. No constituye por sí solo una actualización compatible de las dos líneas presentes. |

Hay trabajo upstream relevante; no se afirma que no existan propuestas. No hay todavía una reparación publicada y compatible demostrada para este árbol y su control. Adoptar PR264/265 exigiría mantener dos variantes de un parser de seguridad, verificar sus cambios de semántica y consumidores, además de resolver el inventario de auditoría. Instalar un commit cuyo paquete siga teniendo una versión afectada no elimina por sí solo el aviso. Renombrar o inventar una versión para que desaparezca la alerta no acredita una reparación.

No se sustituyen paquetes ni se incorpora una excepción basada en estas propuestas sin esa validación. Su seguimiento queda por URL y SHA para evitar repetir la búsqueda o confundir una versión mutable con una reparación verificada.

## Reproducción local acotada

Se ejecutó `.local/picomatch-security-probe.cjs` con Node 24.10.0. Usa solo paquetes ya instalados, procesos hijos independientes y `spawnSync` con tiempo límite de 1000 ms, sin shell. Cada proceso bloqueado termina al vencer su límite. Cadena ficticia: `'a'.repeat(32) + '/'` (33 caracteres).

| Versión instalada | Patrón | Opciones por defecto | Control `noextglob: true` |
| --- | --- | --- | --- |
| 4.0.4 | `+(*)` | Termina el watchdog: ETIMEDOUT | Termina normalmente, no coincide |
| 4.0.4 | `+(*a)` | Termina el watchdog: ETIMEDOUT | Termina normalmente, no coincide |
| 2.3.2 | `+(*)` | Termina el watchdog: ETIMEDOUT | Termina normalmente, no coincide |
| 2.3.2 | `+(*a)` | Termina el watchdog: ETIMEDOUT | Termina normalmente, no coincide |

Ocho ejecuciones comprobadas: cuatro tiempos límite esperados y cuatro controles que finalizan. Los resultados y expresiones compiladas están en `.local/picomatch-security-probe.json`, fecha 2026-11-18 01:37:05 UTC. Esto demuestra bloqueo en esos casos de biblioteca; no demuestra explotación desde la aplicación Kaptal, ni determina toda la superficie de ataque, ni valida los PR candidatos.

Desactivar extglobs en una llamada evita esos dos casos en esa llamada, pero no demuestra cobertura de todos los consumidores transitivos ni elimina el paquete afectado de npm audit. Por ello no se incorpora como arreglo global.

## CI del SHA previamente publicado

[CI 44216292307](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44216292307), SHA exacto `25defa866c230a1e256e1a7fb413537e59eede8e`, terminó **completed/failure**, actualización final 2026-11-18 01:50:28 UTC; reconsulta 01:51 UTC. Los seis jobs terminaron:

- Frontend: fallo en Revisar dependencias/security:check, después de instalación/build/medición y cuatro pruebas del control aprobados; unitarias de producto omitidas.
- Backend, PostgreSQL, Canales y Worker: aprobados.
- E2E Chromium/API/PostgreSQL: aprobado. Log del job 134506979348: 176 pruebas aprobadas y cuatro PWA omitidas solo en el proyecto normal; las cuatro PWA aprobaron después en su proyecto dedicado. También aprobaron arranque y medición de navegación sintéticos.

Este resultado ya corresponde a 25defa8, no es una atribución de los resultados de e205152. Android no se ejecutó para este push documental en correcciones/**; se conserva su antecedente separado. La CI general continúa fallida por seguridad; no se prepara la integración visual.

El cierre documental se publica después de consultar ese desenlace. La rama `revision/**` no está entre los disparadores push del workflow existente; subir solo este cierre no inicia otra CI. Esto no cambia ni desactiva el workflow, no otorga una aprobación al SHA documental y no se usa para integrar producto. El código de producto conserva su CI fallida de 25defa8 y el bloqueo permanece explícito. Evidencia privada final: `.local/picomatch-ci-followup-final.json`.

## Continuidad y límites

Esperar una reparación completa compatible (publicada y contrastada, o una mitigación completa que pueda validarse), comprobar ambas líneas presentes y conservar la cadena visual en una rama nueva desde develop remoto actualizado. Ejecutar auditorías, instalación reproducible, build, unitarias, E2E y CI propia; con CI aprobada preparar la integración visual. PR288 conserva su head y borrador.

PR271 excluido; no desplegar manualmente ni instalar. Solo datos ficticios, sin finanzas reales, sesiones o configuración del teléfono. Conservar calendario; historial, lentitud y logout aplazados. Las galerías y la comprobación interactiva de Inicio pendiente se conservan.
