# Valoración por secciones e importes de Reportes — 16 noviembre 2026

## Base y alcance

PR285 sigue abierto y en borrador en `b23f38a0c807f07b626d97fb0c4ad9142cee2275`. Se reconsultaron con el plugin GitHub la CI general `43770582994` y Android `43770582797`: ambas completed/success para ese SHA. No se trasladan esos resultados al cambio nuevo.

Rama nueva `correcciones/reportes-importes-legibles`, creada desde `origin/develop` actualizado y comprobado `fe13575532c8c055fe699374660988a888b01f6f`, adelantada por fast-forward a la revisión documental `be45b6a` solamente en esta rama para continuar la cadena visual. `origin/main` sigue en `1fd9402bb40012aba4c894b81ecceb09dcfb48a1`. PR271 excluido. Sin integración de ramas protegidas, instalación ni despliegue manual.

Se aplicaron redesign-existing-projects para inspeccionar antes de cambiar, ponytail para limitar el ajuste, angular-developer para plantilla/estilos, debugging-and-error-recovery para reproducción y medición, playwright-cli y ecc-verification-loop para comprobación. No se añadieron dependencias.

## Valoración visual por sección

Inspección directa de las 24 vistas de la propuesta de comparativa14372 en 390 px/claro. Además, muestra de seis vistas en 320 px/200%/oscuro: Categorías, Etiquetas, Metas, Avisos, Reportes y formulario de cuenta. Es una revisión visual de capturas sintéticas, no una inspección individual de las 288 imágenes ni aceptación estética del propietario.

| Sección y vistas | Valoración de la muestra y decisión |
| --- | --- |
| Inicio | Conserva jerarquía de gasto, ingresos, presupuestos y recientes. La captura completa no basta para diagnosticar el comportamiento del dock al desplazar. Sin cambio en esta parte. |
| Captura: chat y formulario | Conserva entrada escrita, accesos manuales y revisión antes de guardar. Sin cambio de distribución ni de confirmación. |
| Cuentas y alta de cuenta | Saldo, moneda y acceso a movimientos diferenciados. El formulario ampliado exige desplazamiento vertical; una captura parcial no demuestra pérdida de los controles inferiores. |
| Presupuestos y formulario | Se conservan la separación del pie y las acciones de la etapa anterior. Sin cambios nuevos. |
| Categorías y formulario | Nombre largo, tipo y acciones separados; la vista ampliada se apila. Sin cambio nuevo. |
| Etiquetas y texto local | Entrada y acciones se apilan al ampliar. El texto ficticio se prepara sin enviarlo. Sin cambio nuevo. |
| Reportes | Hallazgo reproducido: las tarjetas partían los dígitos de `MX$28,000.00` y `MX$500.00` al 200%. Se corrige únicamente el resumen monetario. |
| Metas y formulario de aporte | En la captura ampliada, el nombre ficticio llega a cortar «vacaciones» antes de la última letra y la explicación ocupa mucho alto. Siguiente sección para reproducir y ajustar el espacio disponible; no se modifica aquí su flujo financiero. |
| Compartidos | Distingue fondo común, personas y tipos de registro. Sin cambio nuevo ni operaciones sobre aportes/gastos. |
| Avisos y formulario | Acciones y estados disponibles en la muestra. La diferencia de peso tipográfico respecto de otras secciones queda como valoración estética, sin rediseño automático. |
| Ajustes y perfil | Conserva grupos y edición con datos ficticios. Sin activar canales, modificar preferencias ni guardar el perfil. |
| Calendario, Frecuencias y Rango libre | Inspeccionados como referencia; se conserva la decisión previa sobre el calendario. |
| Historial y detalle | Referencias visuales; se conserva la corrección del importe de PR285. No se reabre el rediseño aplazado del historial. |

## Corrección de Reportes

Las tres cifras usan el pipe `monto` existente con dos decimales, sin símbolo antepuesto, y el código de moneda visible debajo. Se conservan separadores, signo negativo, cero y máscara de privacidad. No cambian cálculos, filtros, servicios, datos ni almacenamiento.

Se impide el salto dentro de cada cifra. En móvil se reserva espacio mediante padding horizontal de 8 px y texto de 1,25 rem, con aumento real 20→40 px; en escritorio 1,65 rem, 26,4→52,8 px. La cuadrícula conserva tres columnas en escritorio con letra normal y admite dos al ampliarla; ambas distribuciones tienen una aserción E2E. Hasta `-9,876,543.21` cabe completo en las combinaciones probadas. Para importes excepcionalmente mayores se permite desplazar solo la cifra, con foco visible y teclado; no se ocultan dígitos con elipsis ni se provoca desborde del documento.

## Comprobaciones locales

- Dos E2E nuevos reprodujeron el defecto original en claro/oscuro: dos líneas del primer importe a 320 px/200%, antes de editar el producto.
- 580 unitarias en 66 archivos aprobadas. TypeScript de la aplicación y comprobación estricta de los archivos E2E/configuración sin errores.
- Siete E2E focales/regresión aprobados: cuatro nuevos y tres existentes. Seis combinaciones de ancho/escala por tema: 320/100%, 320/200%, 390/100%, 390/200%, 1280/100% y 1280/200%. Cubren MXN/USD, centavos, cero, negativo, privacidad, aumento al doble y desplazamiento de `999,999,999,999.99` con teclado.
- Se conservan los fallos intermedios: la medición inmediata del tamaño tras cambiar la raíz podía leer estilos transitorios; ahora espera el tamaño calculado antes de comparar. Otro control señaló nueve píxeles insuficientes para el negativo largo en oscuro, corregidos con padding horizontal fijo. No se rebajaron las aserciones monetarias.
- Build de producción aprobado, carga inicial489,19kB. No hay tarea lint configurada. Permanecen solo los tres avisos CSS anteriores de Login/Avisos/automatic-bank; Reportes queda dentro de su presupuesto, sin aumentar el límite.
- Seis capturas nuevas del producto base PR285 y seis de la propuesta con la misma API ficticia, fecha fija, red externa/SW bloqueados y cero escrituras/previsualizaciones/errores JS. La comparativa nueva es `http://127.0.0.1:14376`; carga de sus12 imágenes, selector de seis modos, ancho390px y cero errores JS comprobados con Playwright.14372 y14368 se conservan. Reinicio de la galería: `python -m http.server 14376 --bind 127.0.0.1 --directory .local/revision-reportes-importes`, desde la raíz del proyecto.

Evidencia privada: `.local/reportes-importes-red`, `.local/reportes-importes-cierre`, `.local/reportes-capture-before`, `.local/reportes-capture-after`, `.local/reportes-unitarias.log`, `.local/reportes-types.log`, `.local/reportes-e2e-types.log` y `.local/reportes-build-cierre.log`. Reproducción: desde `frontend`, `npx --no-install playwright test -c playwright.reportes-importes.config.ts`. La nueva CI debe consultarse sobre su propio SHA al publicar; la aprobación de PR285 no la sustituye.

## Siguiente parte

Valorar Reportes en comparativa14376 y continuar con la reproducción focal de Metas al 200%, en una rama nueva desde develop comprobado, conservando la cadena visual necesaria solo en esa rama. La inspección de una muestra no aprueba toda la aplicación ni acredita teléfono físico. Lentitud/logout siguen aplazados; no se consultaron finanzas reales.

Para otro chat: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md, docs/CI_REVISION_PR285_2026-11-15.md y docs/REVISION_REPORTES_IMPORTES_2026-11-16.md. Verifica el SHA y CI de la rama correcciones/reportes-importes-legibles, revisa comparativa14376 y continúa por Metas con datos ficticios y ajustes demostrados. Conserva PR285 y PR271 sin integrar y no despliegues manualmente.»
