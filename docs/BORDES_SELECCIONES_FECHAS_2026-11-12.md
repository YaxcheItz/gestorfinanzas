# Bordes, selecciones y fechas — 12 noviembre 2026

Rama `mejoras/bordes-controles-accesibles`, worktree `.local/worktrees/bordes-controles`. Creada desde `origin/develop` comprobado contra el remoto (`74a85bb60a7301e38198fa7245d817d57d85f82b`) e incorporada la dependencia de Configuración por fast-forward (`2f31f749063cc6fb15fc8c255e695d1978000667`). Revisión con web-design-guidelines y ponytail: interfaz renderizada antes de corregir, cambios acotados y API/usuario ficticios.

## Hallazgos y correcciones

- Los campos heredaban el borde decorativo tenue. Se incorpora `--kaptal-control-border` en ambos temas para los campos habilitados, conservando los separadores. En 25 campos de Cuentas, Presupuestos, Etiquetas, Metas, Libro diario, Reportes y Perfil, el mínimo medido pasa de aproximadamente 1,06:1 a 3,53:1 en claro y de 1,07:1 a 4,62:1 en oscuro. La regla compartida usa prioridad explícita frente a variantes heredadas; no añade bordes a controles que ya tenían ancho cero.
- La selección de tema tenía bordes entre 2,20 y 2,31:1. Un borde de 2 px con el color de marca y superficies del tema da 4,96:1 en Claro/Automático y 6,10:1 en Oscuro; conserva `aria-pressed`. No se pulsa un cambio de tema ni se guardan preferencias: cada caso recibe un perfil ficticio con su tema inicial.
- En Registro manual, una etiqueta seleccionada usaba texto blanco sobre coral oscuro: 2,34:1. Ahora usa `--kaptal-on-brand` (8,27:1 en oscuro), declara `aria-pressed`, admite activar/desactivar con Espacio y usa fuente relativa y altura mínima de 44 px. El recorrido real es Añadir movimiento → Registro manual → Más categorías, fecha y detalles; no se guarda el movimiento.
- Libro diario recorta el día y Registro manual recorta el año en sus campos nativos a 320 px/raíz 200%. Se añade una referencia visible de los valores completos en año-mes-día y `aria-describedby`. Libro diario muestra «sin límite» al limpiar; Registro manual muestra «sin fecha» si falta. Se conservan los controles nativos y el calendario aprobado; no se cambia el modelo, la validación, el filtro ni el envío financiero.
- Los iconos SVG de la barra superior inspeccionada ya tenían al menos 18,88:1 en claro y 16,44:1 en oscuro. No se cambiaron. Esta medición no comprende todos los iconos, gráficos o estados de la aplicación.
- Los filtros avanzados de Movimientos desbordaban horizontalmente a 320 px/raíz 200%. El cuerpo ahora puede reducir su ancho, los pares de campos se apilan en pantallas estrechas y las acciones envuelven. Los cinco tipos de movimiento declaran `aria-pressed` y usan el mismo borde seleccionado de 2 px. El rango tiene una referencia completa con descripción accesible. No se modifica la lista de movimientos ni se aplica ningún filtro o cambio real en QA.
- Revisados también el rango libre y el anclaje semanal de Inicio, la fecha del editor de propuestas y la de Avisos. En las capturas sus valores completos caben; no se cambian esos controles. El escenario del editor recibe exactamente una respuesta POST simulada de propuesta, bloqueada antes de salir del navegador; se cancela la edición sin actualizar ni confirmar. Avisos se cierra sin guardar la revisión. El tamaño de raíz al 200% no implica que todos los controles con fuente fija en px dupliquen su letra.

El cálculo usa colores computados, composición alfa sobre los ancestros y espera de transiciones. Para los límites se comprueba el contraste frente al interior y al exterior. Excluye campos ocultos/deshabilitados, checkbox, radio y color; no certifica sus dibujos nativos, bordes decorativos ni todos los estados de interacción. Referencia del objetivo de 3:1: [W3C, contraste no textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Guía de revisión: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). No es una certificación completa de WCAG.

## Verificación

Build final y 571 pruebas unitarias en 65 archivos aprobados. TypeScript estricto del E2E nuevo y `git diff --check` aprobados. Once E2E nuevos y regresión acumulada final de 46 casos aprobados en una sola ejecución de 4,6 minutos, después del último cambio de código. No queda prueba de esta etapa en ejecución.

```text
npm run build
npm test -- --watch=false
npx --no-install playwright test --config playwright.bordes.config.ts
npx --no-install playwright test --config playwright.revision-integral.config.ts
```

Evidencias privadas locales en `frontend/.local/` del worktree: `bordes-before`, `etiqueta-before`, `bordes-after`, `fechas-restantes-before`, `bordes-final`, `aviso-fecha`, `regresion-final` y `regresion-completa-final`. Contienen capturas y mediciones JSON. Los primeros intentos del test necesitaron corregir los destinos de UI: Apariencia no tiene campos y Añadir abre primero el chat. Los fallos de contraste documentados se reprodujeron después de corregir esos recorridos. Pruebas con sesión nueva, service workers bloqueados y red externa/escrituras interceptadas; no se usa sesión, finanzas o dispositivo reales.

Persisten los avisos CSS anteriores: Avisos 4,49 kB y automatic-bank 5,01 kB frente al presupuesto de 4 kB. No se añadió dependencia, lint ni cobertura nueva. Sin CI remota comprobada, integración, despliegue, APK o instalación.

## Continuación

El interior de algunos controles nativos puede seguir recortado: en las vistas corregidas la referencia textual permite leer el valor completo al desplazarse. La revisión de fechas nativas encontradas en las fuentes cubre Libro diario, Registro manual, filtros de Movimientos, Inicio, editor del chat y Avisos; el mes de Reportes conserva la solución de la etapa anterior. No se abre ni modifica el calendario aprobado. Pendientes: contrastes/selecciones de otros widgets no medidos (checkbox/radio personalizados, gráficos y estados hover/foco), aceptación visual y Android/TalkBack/teclado físico aislados. Conservar historial sin rediseño, lentitud/logout aplazados, chat sin borradores persistentes y exclusión de PR271.

Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/BORDES_SELECCIONES_FECHAS_2026-11-12.md, además de los planes locales. Crea rama nueva desde develop remoto comprobado e incorpora esta dependencia. Sigue con los widgets y estados de selección/hover/foco no medidos, usando datos ficticios; conserva el calendario aprobado y el historial aplazado, y separa QA local de Android y aceptación visual».
