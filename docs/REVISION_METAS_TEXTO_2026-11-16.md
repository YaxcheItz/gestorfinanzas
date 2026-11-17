# Metas: palabras completas con letra ampliada — 16 noviembre 2026

## Base y hallazgo

Continúa la valoración por sección de `docs/REVISION_REPORTES_IMPORTES_2026-11-16.md`. Rama nueva `correcciones/metas-texto-ampliado` desde `origin/develop` actualizado/comprobado `fe13575532c8c055fe699374660988a888b01f6f`, adelantada por fast-forward a la revisión documental `a71a527` solamente en esta rama. PR286 conserva `685a4ff11c3157541bee2b4bbedf822bdac7c3b7`; main conserva `1fd9402bb40012aba4c894b81ecceb09dcfb48a1`. No se integran PR285/PR286/PR271 ni se despliega manualmente.

Dos casos Playwright reprodujeron el corte de «vacaciones» en dos líneas a 320 px y texto al 200%, en claro y oscuro, antes de editar el producto. La tarjeta heredaba padding de 1 rem en un contenedor con otro padding de 1 rem: al duplicar la raíz de 16 a 32 px, el espacio útil del texto bajaba a unos192px. También se partía «automáticamente» en la explicación final.

## Ajuste concreto

Una sola regla CSS del componente fija el padding horizontal en16px para la sección, sus tarjetas y el formulario exterior de nueva meta. El ancho útil del título pasa a unos256px en320/200%. Se mantiene la fuente: nombres/títulos de tarjeta20→40px y texto/controles16→32px. Se conserva el ajuste de emergencia para nombres sin separadores; no se recorta el nombre con elipsis.

No cambian plantilla, servicios, datos, cálculos, importes, transferencias, almacenamiento, consentimiento ni confirmación. El formulario de aporte/retiro conserva su distribución y acciones. La regla no modifica el padding vertical ni otras secciones.

Se aplican ponytail, debugging-and-error-recovery, angular-developer, redesign-existing-projects, playwright-cli y ecc-verification-loop para mantener el cambio mínimo y comprobar el renderizado. Sin dependencias nuevas.

## Comprobaciones

- Reproducción inicial: dos E2E fallan en la palabra «vacaciones» a320/200%, uno por tema. Evidencia preservada.
- Build de producción, TypeScript de aplicación y comprobación estricta del E2E/configuración aprobados. Solo los tres avisos CSS anteriores; no se aumentan presupuestos.
- 580 unitarias/66 archivos aprobadas en esta etapa.
- Ocho E2E focales/regresión aprobados: dos nuevos de Metas y seis existentes de Metas/Reportes. Los nuevos recorren320/100%,320/200%,390/100%,390/200%,1280/100% y1280/200%, ambos temas. Verifican palabras completas, letra ampliada, nombre de91 caracteres sin separadores, ausencia de desborde, conservación del texto local al abrir/cerrar aporte y cero escrituras/errores JS. Los existentes cubren aporte/retiro, controles, importes y privacidad de Reportes. No se simula una transferencia como prueba de diseño.
- Matriz visual nueva: Metas y formulario de aporte × seis modos × antes/después =24 PNG. API ficticia idéntica, fecha fija, contexto nuevo, red externa/SW bloqueados, cero escrituras/previsualizaciones/errores JS y cero desbordes/fallos de contraste visibles medidos en esos24estados. No equivale a una auditoría global.
- Las ocho capturas al100% son idénticas byte a byte antes/después; se conserva su apariencia normal. La corrección se aprecia al ampliar.
- Comparativa local `http://127.0.0.1:14378`:24 imágenes, dos secciones, seis modos, carga/controles y ancho390px comprobados. Reportes14376 y comparativas14372/14368 conservadas.

Reproducción focal desde `frontend`: `npx --no-install playwright test -c playwright.metas-texto.config.ts`. Evidencia privada: `.local/metas-texto-red`, `.local/metas-texto-green`, `.local/metas-capture-before`, `.local/metas-capture-after`, `.local/metas-build.log`, `.local/metas-unitarias.log` y `.local/revision-metas-texto/normal-comparison.json`. Reinicio de galería desde la raíz: `python -m http.server 14378 --bind 127.0.0.1 --directory .local/revision-metas-texto`.

## CI y siguiente parte

PR286/685a4ff fue reconsultado: Android44014983634 completed/success. CI general44014983650 aún in_progress, con cinco trabajos aprobados y E2E en curso en esa consulta. Su conclusión y la CI del nuevo cambio deben registrarse por SHA; los pases locales no las sustituyen.

Siguiente: valorar Metas en comparativa14378 y continuar la revisión visual por sección con hallazgos o preferencias concretas; Avisos conserva una diferencia tipográfica pendiente de valoración. No iniciar un rediseño general. Calendario conservado; historial/lentitud/logout aplazados. No se usaron finanzas reales, sesiones habituales ni teléfono físico.

Para otro chat: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/REVISION_METAS_TEXTO_2026-11-16.md. Comprueba SHA y CI de correcciones/metas-texto-ampliado y PR286/685a4ff; revisa comparativa14378 y continúa la valoración por sección con datos ficticios y cambios demostrados. No integres PR271 ni despliegues manualmente.»
