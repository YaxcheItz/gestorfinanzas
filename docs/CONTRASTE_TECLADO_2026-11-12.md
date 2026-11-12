# Contraste y navegación por teclado — 12 noviembre 2026

Rama `mejoras/contraste-teclado-secciones`, creada desde `origin/develop` comprobado por fetch y ls-remote: `74a85bb60a7301e38198fa7245d817d57d85f82b`. Dependencia del dock incorporada por fast-forward: `4621c930d0e3edff507c3acbe28bbd27509fe4c0`. El checkout principal conserva su rama documental; no se integra a develop/main.

Skills aplicadas: web-design-guidelines para accesibilidad, angular-developer para reutilizar patrones Angular 21 existentes, ponytail para cambios mínimos, debugging-and-error-recovery para reproducir los fallos y ecc-verification-loop para cerrar las comprobaciones. Playwright y Chromium locales; no se necesitó conectar un servicio externo.

## Hallazgos comprobados y cambios

| Sección | Antes | Cambio y comprobación |
|---|---|---|
| Configuración, notificaciones | Texto ámbar oscuro sobre fondo oscuro: 1,57:1. | Variante clara del texto en oscuro; la medición final de textos verifica el umbral correspondiente. Se aplica también al aviso equivalente de restauración. |
| Configuración, eliminar cuenta | La lista de datos conservaba texto rosa oscuro: 1,61:1. | Variante rosa clara en oscuro; conserva contenido y confirmaciones existentes. |
| Configuración, confirmación | Tras Enter, el foco seguía fuera del diálogo; prueba reproducida antes de editar. | Reutiliza `FocusTrapDirective`: foco inicial dentro, Tab/Shift+Tab contenidos, Escape cierra y devuelve el foco al botón de apertura. No se ejecuta el borrado. |
| Reportes, Ver cifras por mes | El foco nativo oscuro sobre superficie oscura daba 1,12:1. | Se incluye `summary` en la regla de foco compartida. Resultado: 5,55:1 claro y 7,45:1 oscuro. Enter/Espacio abren y cierran la tabla. |
| Configuración a 320px y raíz 200% | Título y casilla desbordaban: scrollWidth 324px frente a clientWidth 272px. El margen de `space-y` dejaba el overlay a 40px del borde superior. | Texto adaptable, casilla con hijo reducible, scroll vertical limitado al viewport y margen superior anulado únicamente en el overlay. Resultado: 272/272px y overlay desde y=0. |
| Presupuestos a 320px y raíz 200% | Cabecera y período desbordaban; diálogo 329/318px. | Cabecera y período pueden pasar a otra fila, título reducible y cierre con espacio propio. Resultado: 318/318px, sin descendientes con desbordamiento en ese escenario. No cambia importes ni operaciones. |

## Alcance de las pruebas

- Contraste: diez secciones en claro y oscuro, más formularios de Cuentas, Presupuestos, Categorías y confirmación de Configuración: 28 vistas/estados. Cuentas y Categorías pobladas, Reportes con resumen/desglose/tendencia ficticios; Presupuestos, Etiquetas, Metas, Libro diario y Avisos vacíos; Pareja sin vinculación. Configuración expande sus apartados para medir textos. No se deduce cobertura de todos los estados poblados a partir de estos casos.
- Eventos de teclado con Playwright: enlace «Ir al contenido», entrada al contenido y recorrido con Tab por los controles visibles de esas diez secciones. Matriz 390×844 claro, 320×844 oscuro/raíz 200% y 1280×844 claro. Se espera a dos mediciones estables del desplazamiento normal antes de comprobar si el foco está dentro del viewport.
- Los cuatro diálogos se abren con Enter tras alcanzar el botón con Tab; se recorre adelante/atrás, se verifica contención y se cierra con Escape, comprobando el retorno del foco. Se comprueba tamaño del diálogo y ausencia de desbordamiento horizontal. No se activa Guardar ni la eliminación de cuenta.
- La regresión acumulada conserva los casos anteriores de chat, controles, formularios, navegación/detalles, listas, pareja/avisos y dock. El selector de ejecución incorpora los cuatro casos nuevos.
- Contextos de navegador nuevos, usuario/contratos ficticios, service workers bloqueados y red externa abortada. Las solicitudes a `/api` se interceptan; una escritura inesperada se rechaza y hace fallar la aserción. Sin backend real, datos financieros, sesión del propietario, APK ni teléfono.

## Verificación y evidencia

Build final aprobado y 569 pruebas frontend aprobadas tras el último cambio de interfaz. Sin lint configurado ni nueva medición de cobertura. Continúan los avisos CSS existentes de automatic-bank (5,01kB) y Avisos (4,49kB), ambos frente a 4kB. Verificados los 12 casos E2E distintos: 11 aprobaron en la ejecución acumulada; el recorrido largo alcanzó el límite heredado de 90s, aunque ya había aprobado aislado. Tras ampliar a 180s, ese caso se repitió con la configuración acumulada y aprobó en aproximadamente 90s. No hubo una única ejecución con los 12 casos verdes; la comprobación final combina esos 11 con la repetición focal aprobada. Sin errores JS ni escrituras inesperadas en los casos nuevos.

Reproducir desde el frontend de este worktree:

```text
npm run build
npm test -- --watch=false
npx --no-install playwright test --config playwright.revision-integral.config.ts
```

Evidencia local bajo `.local/worktrees/contraste-teclado/frontend/.local/`: `contraste-before-stable` y `foco-before` conservan mediciones previas; `teclado-before` reproduce foco exterior; `forms-geometry-before` conserva los recortes. `forms-geometry-after` incluye geometría y capturas corregidas. `teclado-final` contiene el recorrido aislado aprobado. `cierre-verificado` contiene 11 casos aprobados y el límite de tiempo reproducido. `teclado-acumulado-final` guarda la repetición con el límite corregido. Entre esos directorios están las capturas, `audit.json`, `dialogs.json`, `focus-contrast.json` y geometrías. `cierre-final` conserva el ensayo anterior con una medición durante scroll suave que se corrigió esperando dos posiciones estables. Los registros y capturas locales no se publican en Git.

## Límites y continuación

La medición usa colores CSS estabilizados y composición de fondos planos transparentes, normalizados por canvas para soportar `color(srgb ...)`. Excluye controles deshabilitados, texto invisible/decorativo y elementos con opacidad propia reducida. No evalúa antialiasing, todos los estados hover/selección, fondos con imágenes o gradientes, ni constituye certificación WCAG. Se descartó el primer muestreo durante transiciones porque daba falsos positivos. Un fallo aparente en Reportes desapareció al esperar el desplazamiento normal; el foco de bajo contraste sí se reprodujo y corrigió.

Pendientes: estados de carga/error/sin conexión y contenidos poblados que faltan en estas secciones, recorrido de todos los controles de cada apartado de Configuración, contraste de bordes/iconos y selecciones restantes, TalkBack/teclado físico/áreas seguras en Android aislado y aceptación visual del propietario. Chromium con viewport estrecho no acredita teclado virtual real. Sin lint configurado ni medición nueva de cobertura. No se consultó versión instalada, CI remota ni despliegues.

Preservar calendario aprobado, historial aplazado, chat temporal sin borradores persistentes y exclusión de PR #271. Lentitud y carrera de logout siguen aplazadas. No integrar, desplegar ni instalar una entrega por el hecho de subir esta rama.

Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/CONTRASTE_TECLADO_2026-11-12.md, junto con los planes/prompts locales. Crea rama nueva desde develop remoto comprobado e incorpora la dependencia de esta etapa. Continúa estados de carga/error/sin conexión y contenidos poblados pendientes con datos ficticios; después valida accesibilidad Android aislada cuando esté autorizado y disponible».

Referencias: [W3C, contraste de texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [foco visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), [patrón de diálogo modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) y [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).

Codigo de esta etapa: 3c94832528c48a70c70b045413cf4b324c9a1ace subido y comprobado con ls-remote en mejoras/contraste-teclado-secciones. Seguimiento documental posterior en la misma rama. Sin integracion, despliegue, instalacion ni CI remota comprobada.
