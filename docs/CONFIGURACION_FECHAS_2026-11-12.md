# Configuración y mes legible — 12 noviembre 2026

Rama `mejoras/configuracion-fechas-accesibles`, desde origin/develop74a85bb comprobado, con dependencia8725b80 por fast-forward. Worktree `.local/worktrees/configuracion-fechas`. Antes de editar se verificó la instalación solicitada: [informe de Codex](VERIFICACION_CODEX_2026-11-12.md). Skills de implementación: angular-developer, ponytail y verificación local; pruebas sintéticas con Playwright.

## Cambios y evidencia

- Perfil ya tenía carga/error/reintento adecuados: la prueba inicial aprobó y no se cambió su lógica.
- La consulta de disponibilidad Web Push confundía carga o fallo con «el servidor no tiene claves». Ahora distingue consulta pendiente, HTTP/errores lógicos y ausencia confirmada; anuncia la consulta y permite reintentar. No solicita permisos ni crea suscripciones al pulsar el nuevo reintento por sí mismo: conserva el comportamiento previo de reconciliar una suscripción existente cuando Web Push está disponible. En las pruebas, service workers están bloqueados y ninguna suscripción se crea o guarda.
- Recurrencias usa skeleton con estado accesible; cabecera y error pueden envolver su contenido a320/raíz200%. Se conserva el reintento existente y no se ejecutan recurrencias.
- El campo nativo de mes de Reportes puede seguir recortando parte del texto por su presentación de navegador. Ahora se muestra y describe explícitamente «Mes seleccionado: febrero de2027», con nombre completo y año, sin depender del ancho interno del control. El texto se actualiza al seleccionar otro mes. Se mantiene el tipo nativo, los filtros y el calendario aprobado.
- Dos regresiones unitarias nuevas comprueban carga/fallo lógico/error/ausencia de Web Push sin solicitar permisos y formato de mes/año, incluido0099 para evitar el desplazamiento implícito al siglo XX de Date.UTC con años de dos dígitos. No se cambian cálculos financieros.

## Verificación

Build final y571 unitarias aprobados. Cinco E2E focales aprobaron: Perfil, Recurrencias y Avisos pasan lectura detenida, HTTP503, HTTP200fallido, desconexión/reintento y recuperación; los ocho apartados de Configuración se abren/cierran con Enter y recorren con Tab; Reportes expone mes/año completos a320/200%. El recorrido de apartados usa movimiento reducido y no activa guardar, exportar, restaurar, permisos, logout ni eliminación.

Regresión acumulada final:35 E2E aprobados en una ejecución, después del último cambio de código. TypeScript estricto del nuevo E2E aprobado. Sin lint configurado ni cobertura nueva. Persisten avisos CSS de Avisos4,49kB y automatic-bank5,01kB frente a4kB.

```text
npm run build
npm test -- --watch=false
npx --no-install playwright test --config playwright.configuracion.config.ts
npx --no-install playwright test --config playwright.revision-integral.config.ts
```

Evidencias locales bajo `.local/worktrees/configuracion-fechas/frontend/.local/`: `config-before` reproduce cuatro fallos y confirma Perfil; `config-after` reúne cinco focales aprobados y capturas; `regresion-final` guarda el conjunto final. Solo usuario/API ficticios, contextos nuevos, red externa bloqueada y escrituras interceptadas/rechazadas. No se accede a una sesión o dato financiero real.

## Límites y continuación

Las pruebas son de lectura y navegación. No acreditan envío de perfiles/contraseñas, carga real de respaldos, restauración, alta Web Push, sesiones o dispositivos reales. Los campos nativos de otras vistas y el interior del selector de mes pueden necesitar revisión adicional; la referencia textual garantiza la lectura del mes/año en Reportes. Contraste de bordes/iconos/selecciones, aceptación visual y Android/TalkBack/teclado físico siguen pendientes. Sin CI remota comprobada, integración, despliegue ni instalación.

Conservar calendario aprobado, historial aplazado, chat temporal sin borradores persistentes y exclusión de PR271. Lentitud/logout siguen aplazados.

Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md, docs/CONFIGURACION_FECHAS_2026-11-12.md y docs/VERIFICACION_CODEX_2026-11-12.md. Crea rama nueva desde develop remoto comprobado e incorpora esta dependencia. Sigue con contraste de bordes/iconos/selecciones y los campos nativos restantes usando datos ficticios; Android aislado y aceptación visual permanecen pendientes».

Codigo de esta etapa: 937307720780b7b5f8449d1b60335e72508808bb subido y comprobado con ls-remote en mejoras/configuracion-fechas-accesibles. Seguimiento documental posterior en la misma rama. Sin integracion, despliegue, instalacion ni CI remota comprobada.
