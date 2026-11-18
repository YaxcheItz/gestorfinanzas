# Revisión conjunta de Avisos, Cuentas y Presupuestos

18 de noviembre de 2026.

La rama `mejoras/revision-conjunta-avisos-cuentas-presupuestos` parte de `origin/develop` `0ed4cc7410f351992334bf419486a47080c33c2c`, comparado con el remoto antes de crearla. Reúne los cambios de frontend y las pruebas de `05c5946` (Avisos), `4daea3f` (Cuentas) y `47a5204` (Presupuestos). Los tres commits tienen la misma base. Se incluyen los informes de las etapas para conservar la evidencia.

## Resultados con datos ficticios

| Sección | Comprobaciones |
| --- | --- |
| Avisos | Cuenta y Categoría muestran el texto completo con opciones de prefijo compartido. Se verificaron el cambio de selección, el foco y los valores vacíos. En Android simulado se recorrieron Bancos y cuentas y el editor de asociaciones. |
| Cuentas | Tipo de cuenta y confirmación del alta legibles a 320 px y 200 %. Se cotejó el envío ficticio de los días de corte y pago. Aprobaron el ajuste por días inhábiles, el aviso de año sin calendario verificado y el vencimiento con hora de México. |
| Presupuestos | Categoría y Moneda visibles, importes íntegros y ocultación de montos. Se verificaron MXN y USD, exceso, cambio de mes, mes vacío, reintento, alta y edición ficticias. |
| Navegación conjunta | Desde Configuración se entró en las tres secciones sin recargar la sesión, se abrió cada formulario y Escape restauró el foco. La prueba en claro y oscuro a 320 px y 200 % no registró escrituras ni errores de página. |

Se revisaron seis capturas de Chromium de las tres secciones en claro y oscuro a 320 px y 200 %. En Cuentas, la confirmación temporal se superpone a parte de «Agregar cuenta» mientras está visible. El mensaje quedó en dos líneas y se verificó el control para cerrarlo.

Build Angular de 492,24 kB iniciales, TypeScript y 580 pruebas unitarias aprobados. El build emitió avisos de presupuesto CSS en acceso, Avisos y Bancos y cuentas. Playwright aprobó 23 casos en Chromium y siete en Firefox sobre el mismo build. El servidor de pruebas sirvió los archivos locales y rechazó las peticiones de API sin interceptar. En los registros no aparecen peticiones de ese tipo. Capturas y registros en `.local/revision-conjunta-avisos-cuentas-presupuestos/`. La muestra está en `muestra-320-200/`.

## CI de origen

| Sección | Commit | Ejecución |
| --- | --- | --- |
| Avisos | `05c5946d6469c1700a5b83c3d035c4b88fccb5ea` | [CI de Avisos](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44248036852) |
| Cuentas | `4daea3fcbf5355b142e96fc4ac7f9e57286cb414` | [CI de Cuentas](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44344639336) |
| Presupuestos | `47a52044ece4c9e698c822bd3d4236d00e602057` | [CI de Presupuestos](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44377764033) |

Avisos y Cuentas aprobaron sus seis trabajos. Al registrar la revisión, Presupuestos tenía 5 de seis trabajos aprobados. La ejecución se puede comprobar en el enlace. La rama conjunta ejecuta su propia [CI de GitHub Actions](https://github.com/YaxcheItz/gestorfinanzas/actions/workflows/ci.yml?query=branch%3Amejoras%2Frevision-conjunta-avisos-cuentas-presupuestos).

## Continuidad

Calendario conservado. Historial, lentitud y logout siguen aplazados. La referencia de producción verificada es `main` `73fe866ef72cd098a577690a33b504a070c2e9b9`, con estados exitosos en [Vercel](https://github.com/YaxcheItz/gestorfinanzas/deployments/Production) y [Render](https://github.com/YaxcheItz/gestorfinanzas/deployments). La publicación en producción y la instalación en teléfono requieren confirmación explícita por destino.

Siguiente etapa. Revisar las capturas junto con el resultado de CI de la rama conjunta. Si se solicita promover una entrega, preparar su SHA, cambios y destino para aprobación del propietario.
