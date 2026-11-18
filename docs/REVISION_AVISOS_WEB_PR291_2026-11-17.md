# Revisión de Avisos y Bancos y cuentas de PR291

17 de noviembre de 2026, hora de Ciudad de México.

El formulario web **Revisar aviso** recorta las opciones seleccionadas de **Cuenta** y **Categoría** al probar texto al 200 % en un ancho de 320 px. Por ejemplo, la cuenta ficticia «Cuenta ficticia del hogar» aparece como «Cuenta ficticia de» con el selector cerrado. La categoría «Compras familiares QA» también queda recortada. Se observó en claro y oscuro. La página y el formulario caben horizontalmente y **Guardar revisión** se alcanza desplazando el formulario. El problema está en el texto visible dentro de los selectores.

## Comprobaciones

| Superficie | Resultado |
| --- | --- |
| Avisos en la web publicada | El aviso ficticio mostró descripción, importe y acciones. El filtro Registrados mostró su estado vacío y volver a Pendientes recuperó el aviso. Se pudo abrir el editor, modificar una descripción de prueba y cerrar con Escape. El foco volvió a Revisar y corregir y el aviso conservó su descripción original. |
| Bancos y cuentas con Android simulado | Aparecieron el estado de registro y cinco asociaciones ficticias. La edición de una asociación conservó las demás. Se comprobaron búsqueda de aplicaciones, envío de un aviso pendiente y recuperación de un envío pausado con el puente simulado. |
| Edición y alta de asociaciones | En las seis combinaciones de ancho y escala de cada tema, Cancelar conservó una línea y la palabra «asociación» de Guardar asociación quedó completa. A 320 px y 200 % ambos botones fueron alcanzables. Guardar quedó deshabilitado hasta cumplir los requisitos de consentimiento y selección. |

Pasaron 14 casos de Playwright en Chromium. Se ejecutaron seis casos de `avisos-android-ui.spec.ts`, cuatro de `avisos-coherencia-visual.spec.ts` y cuatro adicionales de esta revisión. Se probaron anchos de 320, 390 y 1280 px con texto al 100 % y 200 % en claro y oscuro. La ampliación se aplicó a la fuente raíz del navegador. Se inspeccionaron 16 capturas de la bandeja, el formulario, el pie de guardado y Bancos y cuentas.

La prueba web de `/avisos` cargó el HTML y los recursos públicos directamente de Vercel. Se interceptaron todas las solicitudes de API en un perfil de navegador aislado. Bancos y cuentas requiere el puente Android. Esa parte se probó con respuestas ficticias en el build local, sin usar un teléfono. Las escrituras de las pruebas funcionales se resolvieron solo dentro de la simulación.

## Producción y continuidad

La portada y `/api/health` respondieron HTTP 200 y la API devolvió UP. Se verificaron los SHA de `main` (`73fe866ef72cd098a577690a33b504a070c2e9b9`) y `develop` (`0ed4cc7410f351992334bf419486a47080c33c2c`) contra GitHub. El build local y el sitio coincidieron por SHA-256 en los 60 JS/CSS compilados, incluidos los de carga diferida. El HTML coincidió tras normalizar CRLF a LF. [Kaptal](https://kaptalgf.vercel.app) · [Publicación de PR291](PUBLICACION_VISUAL_PR291_2026-11-17.md)

Las 16 capturas y `hashes.json` quedaron en `.local/revision-avisos-web-pr291/`. La rama `revision/avisos-web-pr291` se creó desde `origin/develop` verificado y registra la revisión y su continuidad documental.

La siguiente parte es reproducir el recorte con dos opciones que compartan prefijo y hacer visible la selección completa a 320 px y 200 %, sin reducir la escala del texto. Continuar después con Inicio y el formulario de Cuentas. Se conserva calendario y siguen aplazados historial, lentitud y logout. Toda publicación en producción o instalación en teléfono requiere confirmación.
