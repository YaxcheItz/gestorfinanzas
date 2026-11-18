# Mitigación temporal de picomatch en PR288

El backport se aplica al instalar las dependencias de desarrollo. El control de seguridad sigue bloqueando la integración porque npm audita las versiones publicadas y el aviso sigue abierto.

## Acuerdo vigente y desenlace de CI

El usuario confirmó continuar con la actualización a versiones oficiales corregidas de ambas líneas, retirar el backport y verificar instalación limpia, auditoría y CI antes de preparar la integración visual. La reconsulta del 18 de noviembre UTC devuelve 2.3.2 como última versión 2.x y 4.0.7 como última versión 4.x. El aviso oficial sigue con rango afectado <=4.0.7 y sin versión corregida. La actualización acordada está bloqueada por la publicación pendiente de esas versiones. El backport se conserva mientras tanto.

La CI 44220998503 de `63b0fd1b571ec56d88a2a84945406ea63e52af62` terminó completed/failure el 18 de noviembre de 2026 a las 02:24:02 UTC. Backend, PostgreSQL, Canales y Worker aprobaron. Frontend instaló el parche en cuatro copias y compiló, después falló en security:check y omitió sus unitarias. Los 176 E2E normales aprobaron. El paso PWA falló antes de ejecutar sus cuatro pruebas, en `check-startup.cjs`, al recibir 401 y observar dos solicitudes sin autorización a /api/cuentas y /api/categorias. La medición posterior de navegación se omitió. Ese resultado reemplaza el estado pendiente de la consulta inicial. [CI del backport](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44220998503).

La comparación local de los dos builds disponibles encontró idénticos los 71 archivos JS/CSS/HTML de producto por SHA-256. El código de producto y la comprobación de arranque coinciden con e205152. Se registra la observación de arranque dentro del límite vigente de logout aplazado, sin atribuir una causa nueva al parche ni afirmar aprobadas las PWA.

El cierre de esta reconsulta usa la rama documental `revision/picomatch-version-oficial`, creada desde develop remoto comprobado y adelantada a 63b0fd1 solo en esa rama, en el mismo worktree de mitigación. El checkout principal sigue en c4fdbce.

La rama `correcciones/mitigacion-picomatch-pr288` se creó en un worktree separado desde `origin/develop` verificado en `fe13575532c8c055fe699374660988a888b01f6f`. Solo en esta rama se adelantó a `c4fdbce48092b738e538c433343ede260d159f8a`, que conserva PR288 y los cierres anteriores. El checkout principal permanece en `revision/cierre-ci-picomatch-pr288`.

El registro npm y el aviso GHSA-fc5q-39xc-vjpf se reconsultaron el 18 de noviembre de 2026 UTC, 17 de noviembre en México. La última versión disponible era 4.0.7 y seguía afectada. Las dos propuestas de origen aún estaban abiertas. [Versiones de picomatch](https://github.com/micromatch/picomatch/releases), [aviso oficial](https://github.com/advisories/GHSA-fc5q-39xc-vjpf).

## Qué se aplica

`npm ci` ejecuta `frontend/scripts/patch-picomatch.mjs` en postinstall. El script recorre las cuatro rutas de desarrollo del lockfile, una 4.0.4 y tres 2.3.2. Antes de escribir comprueba los hashes SHA-256 de los archivos originales y el resultado esperado para las dos líneas. Repetir la instalación aplica el mismo cambio. Una versión desconocida, un archivo con contenido inesperado o una instalación parcial provocan un error. Si se omiten todas las dependencias de desarrollo en una instalación de producción, el script termina sin escribir.

El backport adapta las propuestas de jscraik a las versiones fijadas en el proyecto. Quita la repetición exterior cuando la rama con comodín admite una reescritura equivalente. Para otras combinaciones cubiertas, reutiliza la protección existente del parser. Los casos complejos pueden tratarse como literales y la opción explícita `maxExtglobRecursion: false` conserva su semántica. La comprobación se limita al aviso en cuestión y a las opciones por defecto del árbol usado por Kaptal. El archivo de licencia MIT acompaña la adaptación. [Propuesta para 4.x](https://github.com/micromatch/picomatch/pull/262), [backport para 2.x](https://github.com/micromatch/picomatch/pull/263).

Se mantienen los nombres, versiones, orígenes e integridades del lockfile. Su única diferencia es la marca del script de instalación del proyecto. El backport no añade dependencias de npm y no descarga código para aplicarse. El control de auditoría, su excepción previa de braces, los workflows y el producto de PR288 siguen intactos.

## Comprobaciones

| Comprobación | Resultado |
| --- | --- |
| Instalación limpia `npm ci` | Postinstall verificó las cuatro copias. |
| `node --test scripts/patch-picomatch.test.mjs` | 8 pruebas aprobadas. Verifican la forma de la expresión compilada y coincidencias benignas en cada copia. |
| Build de producción | Aprobado con 489,19 kB iniciales y los tres avisos de presupuesto CSS existentes. |
| Unitarias de frontend | 580 aprobadas en 66 archivos. |
| E2E focales de Avisos | 9 aprobados con datos ficticios y Android simulado. |
| `npm audit --omit=dev --json` | Salida 0 y cero vulnerabilidades reportadas. |
| `npm audit --json` y `npm run security:check` | Salida 1. El aviso distinto es GHSA-fc5q-39xc-vjpf, con 23 entradas de dependencia y propagación. Las cuatro pruebas del control pasan antes de que el control rechace el informe. |

La CI de esta rama se comprueba por el SHA publicado. El enlace y la observación de cierre se guardan en la evidencia local `.local/picomatch-mitigacion-ci.json`. Mientras el control siga fallando, la integración visual permanece pendiente.

Para retirar el backport, actualizar las dos líneas con versiones compatibles, quitar postinstall y sus archivos asociados, regenerar el lockfile y verificar una instalación limpia, auditoría y CI del SHA resultante. PR271 queda excluido. Sin despliegue manual ni instalación en teléfono. Solo datos ficticios y sin tocar sesiones, finanzas reales ni configuración del dispositivo. Calendario conservado. Historial, lentitud y logout aplazados.
