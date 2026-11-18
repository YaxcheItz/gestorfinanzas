# PR288: reconsulta del bloqueo de picomatch

Seguimiento posterior: [CI, propuestas upstream recientes y reproducción aislada](CI_PICOMATCH_SEGUIMIENTO_2026-11-17.md). Este documento conserva la evidencia de la primera investigación.

17 noviembre 2026, hora de México; reconsulta a partir del 18 noviembre 2026, 01:19 UTC.

## Resultado

**Bloqueo vigente, sin solución compatible demostrada.** No se cambian dependencias, código de producto, workflows ni el control de seguridad. No se amplían excepciones. La auditoría completa y `npm run security:check` siguen fallando; la auditoría de producción termina correctamente. No se declara aprobada la CI.

## Checkout y conservación de la cadena visual

- Inicio limpio en `revision/valoracion-14384-inicio-cuentas`, `f97aec6bdf8d1ca371b212af90a36a64236fa3f3`, coincidente con su remoto.
- Fetch y `ls-remote` confirman `origin/develop` en `fe13575532c8c055fe699374660988a888b01f6f` y main en `1fd9402bb40012aba4c894b81ecceb09dcfb48a1`.
- Rama nueva `correcciones/seguridad-picomatch-pr288`, creada desde ese develop remoto y adelantada por fast-forward a f97aec6 **solo en esta rama**, para conservar la cadena visual y sus documentos. Develop y main no se integran.
- [PR288](https://github.com/YaxcheItz/gestorfinanzas/pull/288) sigue abierto/borrador, sin fusionar, head `e205152a5936f8f4803c977b5c99633d8577663b`. Es ancestro del checkout; los cambios entre e205152 y f97aec6 son cinco documentos. Esta parte solo añade/actualiza documentación.

## Evidencia actual

| Comprobación | Resultado |
| --- | --- |
| [Aviso oficial GHSA-fc5q-39xc-vjpf / CVE-2026-112366](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) | Revisado el 17 de noviembre; rango afectado `<=4.0.7`, sin versión corregida. ReDoS por extglobs repetidos de una sola rama. |
| Registro npm: `npm view picomatch version dist-tags versions --json` | `latest: 4.0.7`; no se publica una versión posterior ni otro dist-tag en la consulta. Actualizar 4.0.4 a 4.0.7 no elimina este aviso. |
| `npm ls picomatch --all` y package-lock | 4.0.4 en Angular/build/CLI/devkit, Sass/Parcel, tinyglobby/fdir, Vite y Vitest; 2.3.2 en anymatch/readdirp/micromatch de Tailwind 3.4.19. Cuatro ubicaciones, todas `dev: true`, coincidentes entre árbol instalado y lock. |
| `npm audit --json` | Salida 1, 23 entradas altas contando propagaciones de un único aviso distinto, GHSA-fc5q-39xc-vjpf. `picomatch.fixAvailable: false`. Las entradas no equivalen a 23 vulnerabilidades independientes. |
| `npm audit --omit=dev --json` | Salida 0; cero vulnerabilidades reportadas. No certifica toda la aplicación. |
| `npm run security:check` | Cuatro pruebas del control aprobadas; después salida 1 con «La auditoría contiene vulnerabilidades nuevas o ajenas a la cadena conocida de braces». |
| Revisión con el informe real reducido solo a picomatch | `revisar` rechaza ese aviso; acepta el informe limpio de producción. No se requiere ni se introduce un cambio en el control. |

Entorno local: Node 24.10.0, npm 11.13.0. CI usa Node 22. No se ha ejecutado `npm audit fix --force`, reinstalado dependencias ni modificado node_modules.

Skills aplicadas: `debugging-and-error-recovery` para reproducir y localizar el fallo; `ponytail` para limitar el cambio a evidencia necesaria; `ecc-verification-loop` para auditorías, diff y comprobación de CI. Conector GitHub para PR, jobs y logs; CLI GitHub para listar el run de push, que el conector disponible filtra a eventos pull_request.

## Alternativas contrastadas

| Alternativa | Motivo para no aplicarla |
| --- | --- |
| Actualización u override a una versión publicada de picomatch | La última publicada sigue afectada. Reemplazar también 2.x por 4.x sería además un salto mayor, sin reparación de este aviso. |
| Propuesta upstream [micromatch/picomatch#194](https://github.com/micromatch/picomatch/pull/194) | Su propio autor indica que no resuelve el caso `+(*a)`; no es una corrección completa de este aviso. No se instala una rama o fork parcial como arreglo. |
| Desactivar extglobs o filtrar patrones en una configuración de la aplicación | No cubre todos los consumidores transitivos. Devkit llama a `parse(glob)`, Angular proxy a `makeRe(key)` y Vite a picomatch desde varias rutas; no hay un único punto controlado por esta aplicación demostrado. Tampoco elimina el paquete vulnerable del informe. No se presenta como mitigación verificada. |
| Cambiar Angular/Tailwind según las sugerencias de audit | El informe propone Angular CLI 16.2.0 y Tailwind 4.3.5 como cambios mayores. No son una actualización compatible de este proyecto Angular 21/Tailwind 3 ni resuelven por sí solos las otras rutas a picomatch. |
| Parche manual, sustitución de API o nueva excepción | No hay parche completo validado aquí contra los consumidores. Un parche en node_modules tampoco corrige por sí solo el inventario versionado de npm. Ampliar excepciones u omitir la auditoría incumpliría el alcance autorizado. |

Se preservan `frontend/scripts/check-dependencies.mjs`, sus pruebas y la excepción previa exclusivamente para GHSA-vfj7-8cjw-p6xm y su cadena de braces. La revisión de consumidores es focal; no se declara un análisis exhaustivo de todas sus rutas.

## CI comprobada y límites de las pruebas

Se reconsultó el [run 44194248517](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44194248517) y el log de Frontend 134431336675: `Revisar dependencias` falla al ejecutar `npm run security:check`; unitarias remotas omitidas. La subida del artefacto de tamaño terminó antes correctamente; el log consultado no muestra un fallo de cuota de almacenamiento. La salida del control es genérica; el informe npm actual identifica el aviso concreto.

Los otros cinco trabajos de ese run están aprobados. Son antecedentes de e205152: 176 E2E y 4 PWA, Android 44194248531 aprobado, 580 unitarias y 9 E2E focales locales. No se trasladan estos resultados a un SHA nuevo. Esta parte documental no repite build, unitarias de producto ni E2E; comprueba auditorías, pruebas del control, rechazo del aviso real, ascendencia y diff. Al subir la rama `correcciones/**`, el workflow CI existente se activa; su resultado se debe consultar por el SHA publicado. No se reintenta la CI antigua suponiendo que haya una reparación.

### CI nueva observada

El commit documental `ad29a5676c73cde9905f109ffc2d65ecce56aa4e` se subió y se comprobó por `ls-remote`. Su [CI 44215413415](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44215413415), evento push, reproduce el fallo en Frontend 134503902189: instalación, compilación, medición y subida de artefacto aprobadas; las cuatro pruebas del control pasan y la auditoría sale con código 1 a 2026-11-18 01:23:45 UTC. Las unitarias de producto se omiten. Backend, PostgreSQL, Canales y Worker ya terminaron correctamente; E2E seguía en ejecución al tomar esta evidencia. El run completo no se declara aprobado ni se atribuyen a él los 176 E2E/4 PWA anteriores.

El commit posterior de cierre solo incorpora esta evidencia y precisión documental, con producto idéntico a ad29a56 y e205152. Su push activa otra ejecución por la configuración existente de concurrencia; puede cancelar la ejecución anterior todavía activa. Se consulta el nuevo run por su SHA al cerrar; los resultados completos/pendientes se registran en la evidencia local y la respuesta de entrega. Una comprobación de seguridad fallida ya impide aprobar la CI, aunque otros trabajos continúen.

Evidencia privada: `.local/picomatch-recheck-audit.json`, `picomatch-recheck-production.json`, `picomatch-recheck-versions.json`, `picomatch-ci-security-evidence.json`; resultados y SHA final de cierre en `.local/picomatch-pr288-cierre.json`. No contienen datos financieros.

## Siguiente parte

Reconsultar aviso y versiones. Cuando exista una reparación completa compatible, usar una rama nueva desde develop remoto actualizado, conservar la cadena visual y ejecutar instalación reproducible, auditorías, build, unitarias, E2E y CI del SHA exacto. Solo con CI aprobada preparar la integración visual; PR288 sigue en borrador mientras tanto.

PR271 continúa excluido. Sin despliegue manual ni instalación. Usar datos ficticios; no tocar finanzas reales, sesiones ni configuración del teléfono. Conservar calendario; historial, lentitud y logout siguen aplazados. La valoración interactiva de Inicio y después formulario de cuenta/Presupuestos sigue pendiente detrás de esta prioridad.

Para otro chat: «Continúa Kaptal/GestionFinanzas desde `correcciones/seguridad-picomatch-pr288`; comprueba checkout y SHA remoto. Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md, docs/CI_AVISOS_DEPENDENCIAS_2026-11-17.md y docs/SEGURIDAD_PICOMATCH_PR288_2026-11-17.md. GHSA-fc5q-39xc-vjpf sigue sin parche: latest 4.0.7 afectada; security:check falla y el control permanece intacto. PR288/e205152 conserva la cadena visual. Reconsulta una reparación compatible y verifica CI por SHA; después prepara la integración visual. No integres PR271 ni despliegues manualmente; solo datos ficticios, sin finanzas reales/sesiones/teléfono. Calendario conservado; historial/lentitud/logout aplazados».
