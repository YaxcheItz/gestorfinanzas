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

La CI 44227339081 del SHA `480c17606286b349588615d97ad2368054b431f7` terminó completed/success en sus seis trabajos el 18 de noviembre de 2026 a las 03:19:22 UTC. Seguridad y 580 unitarias remotas aprobadas. El log de E2E confirma 176 pruebas normales y cuatro PWA dedicadas aprobadas, más arranque 200/401/503 y navegación sintéticos. Las cuatro PWA se omiten únicamente en el proyecto normal. [CI del código corregido](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44227339081).

Se preparó PR289 en borrador sobre la rama de PR288. Head `480c176`, remoto verificado y sin conflictos con su base. La integración visual queda preparada para revisión con esta aceptación temporal explícita. PR288 conserva `e205152`. [Propuesta de parche y control](https://github.com/YaxcheItz/gestorfinanzas/pull/289).

El cierre documental usa `revision/cierre-picomatch-control-verificado`, creada desde develop remoto comprobado y adelantada a 480c176 solo en esa rama. Sus cambios posteriores son documentales y el resultado de CI anterior corresponde al SHA de código indicado. Evidencia local en `.local/picomatch-control-verificado-ci.json`. Android no se ejecutó en esta etapa. PR271 excluido. Sin despliegue manual ni instalación en teléfono. Datos ficticios, sin finanzas reales, sesiones habituales ni configuración del dispositivo. Calendario conservado. Historial, lentitud y logout continúan aplazados.
