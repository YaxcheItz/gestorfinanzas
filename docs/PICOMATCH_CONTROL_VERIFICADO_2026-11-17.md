# Picomatch con aceptación condicionada al backport

La etapa añade una aceptación temporal del aviso GHSA-fc5q-39xc-vjpf exclusivamente en desarrollo, respaldada por verificación del código instalado y pruebas adversarias ejecutadas por security:check. Producción sigue rechazando cualquier vulnerabilidad reportada. El registro oficial continúa sin versión corregida. [Aviso oficial](https://github.com/advisories/GHSA-fc5q-39xc-vjpf).

La rama `correcciones/picomatch-parche-verificado` se creó desde develop remoto comprobado `fe13575532c8c055fe699374660988a888b01f6f` y se adelantó a `ba72c2c` solo en esta rama. Se conserva la cadena visual de PR288/e205152. El worktree es `.local/worktrees/mitigacion-picomatch-pr288`.

## Corrección adicional

La revisión encontró que el backport de 63b0fd1 aún bloqueaba con `+(!(a))`. La negación genera internamente un comodín aunque el cuerpo no contenga un token de estrella. Ahora esa forma entra en la protección existente del parser y se trata como literal. La prueba comparativa, con procesos hijos limitados a un segundo, reproduce el bloqueo en las copias originales 2.3.2/4.0.4 y termina correctamente con el backport corregido.

## Condiciones del control

Antes de admitir el aviso, security:check ejecuta 19 pruebas. Incluyen 1.248 evaluaciones adversarias en cuatro procesos con plazo de tres segundos, cuatro copias de biblioteca, 13 patrones, ocho opciones y tres entradas sintéticas. Después verifica los hashes SHA-256 de los parsers corregidos, las otras fuentes ejecutables y package.json en todas las copias del lockfile. Se cubre también la entrada posix.js de 4.x.

Una copia ausente, un archivo alterado o una versión desconocida hacen fallar la verificación. Las pruebas comprueban esos rechazos. Solo se admite el identificador exacto GHSA-fc5q-39xc-vjpf y sus propagaciones cuya cadena termina en picomatch. Una segunda alerta, un identificador distinto o una cadena incompleta o cíclica siguen bloqueando. La excepción previa de braces conserva sus condiciones.

La aceptación se basa en el contenido corregido y en estas pruebas acotadas. npm audit continúa mostrando el aviso del paquete publicado. Este cambio permite que el control del proyecto evalúe la mitigación concreta. Cuando haya versiones oficiales corregidas compatibles con ambas líneas, se retirarán backport, hashes, pruebas y esta aceptación para volver a depender de la auditoría ordinaria.

## Validación y continuidad

Instalación limpia, 19 pruebas del control/parche, build, 580 unitarias y 9 E2E focales de Avisos aprobados en local. La comprobación sintética de arranque aprobó los escenarios 200/401/503. La revisión anterior de CI 44220998503 conserva su fallo de arranque 401 y sus cuatro PWA sin ejecutar. Historial, lentitud y logout continúan aplazados.

La CI de esta rama se consulta por el SHA publicado. Las comprobaciones locales y el estado remoto se registran en `.local/picomatch-control-verificado-ci.json`. Solo con CI completa aprobada se preparará la integración visual. PR271 excluido. Sin despliegue manual ni instalación en teléfono. Datos ficticios, sin finanzas reales, sesiones habituales ni configuración del dispositivo. Calendario conservado.
