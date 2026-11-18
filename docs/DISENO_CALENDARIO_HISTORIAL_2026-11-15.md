# Calendario, historial y lectura al 200% — 15 noviembre 2026

## Autorización y base

El propietario amplía expresamente el alcance: permite mejorar también calendario e historial y pide una presentación más minimalista. Esta autorización sustituye la decisión anterior de conservar sus diseños. No autoriza integrar PR271, cambiar finanzas reales, instalar ni desplegar manualmente. La valoración estética del propietario sigue pendiente.

CI de PR283/d875d853b4f3a60fe18bd529dc36cb854e9ece66 reconsultada: general43738402517 y Android43738402492 completed/success. Nueva rama diseno/calendario-historial-minimalista desde origin/develop fe13575532c8c055fe699374660988a888b01f6f actualizado/comprobado; incorpora d875d85 por fast-forward solo en esta rama. Main permanece1fd9402bb40012aba4c894b81ecceb09dcfb48a1. Worktree .local/worktrees/calendario-historial-minimalista.

Se aplican redesign-existing-projects y minimalist-ui para revisión previa y simplificación; ui-ux-pro-max para reflujo y controles; ponytail para limitar el cambio; angular-developer, debugging-and-error-recovery y ecc-verification-loop para comprobación. Se mantiene Angular21/Tailwind3, tipografías instaladas y paleta de Kaptal. Sin nuevas dependencias o imágenes externas.

## Hallazgos y decisiones por sección

| Superficie | Antes | Ajuste |
|---|---|---|
| Calendario | Dos etiquetas por mes, doce tarjetas con borde y sombra, controles de32/36px y textos fijos. | Una abreviatura visible por mes y nombre completo/año accesibles. Cuadrícula plana de cuatro columnas; dos cuando el texto grande deja poco ancho. Selección por borde/acento, controles de44px, tipografía rem y desplazamiento del diálogo si hace falta. Conserva meses, frecuencias y fechas libres. |
| Navegación de año | «Año siguiente» parecía disponible en el año actual, aunque cambiarAnioModal ya impedía avanzar al futuro. | El disabled del botón refleja esa misma regla existente. No se cambia el cálculo de periodos. |
| Historial | Descripción e importe competían por una fila; nombres truncados, varias fuentes fijas, tipos fuera de pantalla y buscador casi oculto al200%. | Descripción/cuenta con espacio propio y cifra en su fila, separadores discretos sobre el fondo de la página, iconos contenidos y textos en rem. Tipos distribuidos en varias filas y buscador de ancho completo cuando hace falta. Se mantienen detalle, filtros, resumen, paginación y gestos. |
| Encabezado de historial | Al ampliar, título y «Más opciones» causaban2px de desborde en oscuro a320px. | Encabezado adaptable; las herramientas pueden pasar a otra fila. El foco visible queda dentro de la fila. |
| Ingresos y detalle | En claro, ingreso+MX$28,000 con contraste2,54:1; textos de detalle4,24:1 y «Editar»3,56:1. | Ingresos usan el token existente. Detalle sin panel decorativo gris y «Editar» neutro con texto del tema. Los ocho focales incluyen contraste mínimo4,5:1 para los textos afectados. |
| Títulos de secciones | 30px al100% y60px al200%, con palabras partidas en pantallas estrechas. | Jerarquía más contenida:22/24/28px según ancho al100%;44/48/56px al200%. Se conserva el aumento real al doble. Cambia también Movimientos conforme a la nueva autorización. |
| Cuentas y Presupuestos | El símbolo repetido y el padding que también se duplicaba estrechaban la cifra y separaban centavos. | Moneda indicada en la etiqueta/cabecera y cifra principal sin símbolo repetido. Padding móvil de16px. Se mantienen signo, separadores, precisión, formato del pipe y máscara de privacidad. |
| Chat | Micrófono y enviar dejaban muy poco ancho para escribir al200%. | El campo ocupa una fila completa y las acciones quedan debajo cuando el contenedor es estrecho. No se envía el texto de prueba ni cambia el modelo de conversación. |

No se cambian servicios, cálculos financieros, formatos bancarios, autenticación, persistencia, permisos o reglas de confirmación. Los iconos/categorías y las operaciones mostradas son ficticios; no se reclasifica historia.

## Evidencia y comprobación

Comparativa disponible http://127.0.0.1:14368 : PR283/d875d85 frente a esta rama,24 vistas en seis configuraciones y288 imágenes. Incluye calendario, frecuencias, rango libre, historial poblado con gasto/ingreso, detalle, las veinte vistas de coherencia y formularios.390/100%,1280/100% y320/200%, cada uno en claro/oscuro. Carga de las288 imágenes, selectores independientes, seis modos y ancho de390px comprobados sin errores JS. Las galerías14359 y14361 conservan las etapas anteriores.

Capturas con API ficticia, contexto nuevo, service worker y red externa bloqueados, fecha fija14 noviembre y animaciones finitas terminadas antes de fotografiar. Las primeras capturas de calendario tomadas durante una animación no se usaron como defecto de transparencia; la base comparada se repitió tras esperar el final. La auditoría registra cero escrituras, previsualizaciones y errores JS.

Ocho focales de minimalismo: calendario/operación, historial/teclado, cifras/títulos/chat y contraste, en ambos temas. Los casos de calendario e historial recorren390/100%,1280/100% y320/200%. Se prueban los doce meses, año previo/siguiente, límite futuro, meses/frecuencias/rango libre, filtros, detalle y retorno del foco. Las cifras incluyen una cuenta ficticia9,876,543.21 y presupuesto1,500.00 completos; la prueba unitaria nueva conserva signo/centavos y privacidad al indicar la moneda en una etiqueta.

Los focales previos fallan contra el artefacto inmutable d875d85: calendario, tipografía/controles de historial y cifras/chat; el caso oscuro de contraste era correcto antes. El caso claro de ingreso reproduce el contraste insuficiente. Se conserva esa evidencia en .local/baseline-focal-final.

Un recorrido inicial del test nuevo enfocaba una fila mientras aún cambiaban los resultados de filtros; se corrigió el arnés para esperar respuesta GET y aria-busy=false. No se cambió la gestión de foco de la aplicación por esa carrera del test. Una ejecución integral intermedia se detuvo al encontrar los contrastes del caso ampliado; no acredita el código final.

Comprobaciones al preparar publicación:580 unitarias en66 archivos, build final489,14kB, ocho focales en19,7s, TypeScript estricto y diff sin errores. La auditoría final de144 estados aprobó en2,7min, sin desbordes del documento ni fallos de contraste visibles medidos; no hay recortes medidos en las cinco superficies principales revisadas. Permanecen los tres avisos CSS anteriores de Login/Avisos/automatic-bank. Los tres recorridos funcionales previos con backend local H2 en memoria aprobaron en1,5min; se repiten con los cuatro casos PWA sobre el código final. La batería integral ampliada de101 E2E y CI del nuevo SHA se registran en el cierre cuando terminen; no se declaran aprobadas por anticipado.

Una ejecución unitaria intermedia no pudo renombrar dos archivos temporales de Vite en Windows (UNKNOWN rename), antes de ejecutar esas dos suites. El reintento completo aprobó580/66; no se atribuye a este cambio una corrección del entorno. La primera configuración combinada de flujos/PWA omitía cuatro casos al usar un nombre de proyecto distinto de chromium-pwa. Se corrige con proyectos separados, SW bloqueado en los flujos y real en PWA. El recorrido de registro también necesita esperar a que la ruta del historial esté lista antes de emitir su evento de apertura; se añadió esa espera al test. Las omisiones y el fallo inicial no se cuentan como aprobados.

Evidencia privada en frontend/.local del worktree: minimalismo-before, minimalismo-after-final, focal-final, baseline-focal-final, unitarias-final.log, build-final.log, integral-final-completo y funcional-pwa-final. Configuraciones reproducibles: playwright.minimalismo.config.ts, playwright.revision-integral.config.ts y playwright.minimalismo-funcional.config.ts. Estas últimas pruebas usan exclusivamente backend de test; no se ejecutan contra producción.

## Continuidad

Cerrar la batería final y verificar SHA remoto/CI en el PR borrador. Publicación de rama no equivale a integración, instalación o despliegue manual. La conexión existente de Vercel puede generar una Preview automática al abrir el PR; comprobar y distinguir su entorno si aparece. No cambiar hosting como parte del diseño.

Siguiente: el propietario revisa calendario, historial, importes y chat en comparativa14368. Ajustar únicamente los detalles que resulten de esa valoración y de las comprobaciones; después preparar la integración solo cuando se autorice. PR271 sigue excluido y lentitud/logout continúan aplazados.

Para otro chat: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/DISENO_CALENDARIO_HISTORIAL_2026-11-15.md. Continúa desde diseno/calendario-historial-minimalista, dependiente de PR283/d875d85. El propietario autorizó rediseñar calendario e historial; revisa comparativa14368 y revalida SHA/CI. Usa datos ficticios; no integres PR271 ni despliegues manualmente».


## Cierre local final

Código final: 580 unitarias en 66 archivos, 101 E2E en 10,7 min y siete casos con backend H2 en 2,5 min aprobados. Estos siete son tres funcionales y cuatro PWA con service worker real, sin omisiones. TypeScript estricto y build de 489,14 kB correctos. Auditoría final de 144 estados sin desbordes del documento ni fallos de contraste medidos; galería de 288 imágenes verificada. La ejecución integral intermedia detenida y los fallos de arnés/entorno no se cuentan como aprobados. Queda consultar CI del SHA publicado y la valoración estética del propietario. Sin integración, instalación o despliegue manual.


## Publicación comprobada del diseño / PR284 — 15 noviembre 2026

Rama diseno/calendario-historial-minimalista publicada en3f4d720382936a84cdeecf6c86256a3f1014887f, idéntico al SHA remoto comprobado, y worktree limpio. PR284 borrador hacia develop: https://github.com/YaxcheItz/gestorfinanzas/pull/284 . La base developfe13575 y main1fd9402 permanecen sin cambios; PR271 no integrado. PR283/d875d85 tiene CI general y Android revalidadas con éxito.

El propietario autorizó rediseñar calendario e historial. La propuesta simplifica meses y selección, hace legibles las filas y controles del historial, adapta títulos al doble de fuente, conserva cifras/centavos/privacidad al indicar la moneda en sus etiquetas y amplía el campo del chat. Revisar http://127.0.0.1:14368 :288 imágenes,24 vistas,seis modos; galerías14359 y14361 conservadas. Auditoría final144 estados sin desbordes del documento ni fallos de contraste visibles medidos. Datos ficticios y contextos aislados; sin escrituras/previsualizaciones/errores JS en auditoría y focales.

Código final:580 unitarias/66 archivos,101 E2E locales en10,7min,TypeScript estricto y build489,14kB aprobados. Siete casos locales adicionales en2,5min con backend H2 en memoria: tres funcionales y cuatro PWA con service worker real, sin omisiones. Siete de los ocho focales fallan contra d875d85 y los ocho pasan en la propuesta; contraste oscuro ya pasaba antes. No se equipara lo local con CI/PostgreSQL, teléfono o datos reales.

CI general43767153271 y Android43767153323 están en curso al registrar. Consultar por el SHA exacto; no declarar CI remota aprobada todavía. El cierre posterior permanece en checkout documental, planes locales y PR para preservar el SHA del código verificado.

No hubo integración, instalación o despliegue manual. La conexión existente de Vercel generó automáticamente la Preview7810676038 para3f4d720: GitHub devuelve environment=Preview y production_environment=false. No se cambió hosting ni producción.

Pendiente: resultado de CI general/Android y valoración estética del propietario. Continuar ajustes concretos desde esta propuesta, manteniendo reglas/datos, chat sin borradores, PR271 excluido y lentitud/logout aplazados.

Para otro chat: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/DISENO_CALENDARIO_HISTORIAL_2026-11-15.md. Continúa desde PR284/3f4d720, revalida SHA/CI y revisa comparativa14368. Calendario e historial tienen autorización nueva de rediseño. Usa datos ficticios; no integres PR271 ni despliegues manualmente».


## Revisión de PR284 y comparativa14368 — 15 noviembre 2026

Ver docs/REVISION_PR284_COMPARATIVA14368_2026-11-15.md. SHA3f4d720 remoto revalidado, PR284 abierto/borrador; PR271 sin integrar y develop/main sin cambios. Android CI aprobada; CI general aún en curso en la consulta inicial, con cinco jobs aprobados y E2E ejecutándose. El informe contiene la última consulta.

Se comprobaron288 imágenes por HTTP local, decodificación e igualdad con la fuente. Se inspeccionaron28 capturas focales de ocho superficies. El detalle al320/200% conserva el importe partido en tres líneas en claro/oscuro, igual que PR283: pendiente preexistente, no regresión nueva. Observación menor de espacio del pie del presupuesto; valorar densidad del historial y scroll de calendario. No se modificó código ni se usaron datos reales. Las pruebas de la etapa anterior no se repitieron.

Documentación en rama nueva revision/pr284-comparativa14368, desde develop remoto comprobado y fast-forward solo en esa rama a PR284. Sin integración, instalación o despliegue manual. Siguiente: resolver el detalle ampliado en una etapa de implementación con prueba focal y nueva rama. Valoración estética del propietario pendiente.

Para otro chat: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md, docs/DISENO_CALENDARIO_HISTORIAL_2026-11-15.md y docs/REVISION_PR284_COMPARATIVA14368_2026-11-15.md. Continúa PR284/3f4d720: confirma CI y atiende el importe partido del detalle a320/200% con datos ficticios. No integres PR271 ni despliegues manualmente».
