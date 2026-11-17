# CI de Avisos: dependencia sin parche — 17 noviembre 2026

## Resultado y separación de evidencia

PR288 conserva head `e205152a5936f8f4803c977b5c99633d8577663b`. [CI general 44194248517](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44194248517): completed/failure. Frontend terminó con fallo en `npm run security:check`, después de compilar y medir el build correctamente. Su paso de unitarias se omitió; las 580 unitarias de esta etapa son locales. Backend, PostgreSQL, Canales y Worker terminaron correctamente. E2E Chromium/API/PostgreSQL terminado correctamente: 176 pruebas del proyecto normal y 4 PWA en el proyecto dedicado; las cuatro PWA se omiten solo en el proyecto normal. Arranque y navegación sintéticos aprobados. [Android 44194248531](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44194248531) completed/success; APK no instalada. Consulta: 2026-11-17 23:10:02 UTC.

El control informa un aviso ajeno a la cadena de `braces` admitida previamente. Se conservan su código y pruebas sin cambios: `frontend/scripts/check-dependencies.mjs` y `.test.mjs`. No se amplía la excepción ni se omite la comprobación.

## Diagnóstico comprobado

- `npm audit --json` identifica `picomatch`, aviso [GHSA-fc5q-39xc-vjpf / CVE-2026-112366](https://github.com/advisories/GHSA-fc5q-39xc-vjpf): ReDoS por extglobs repetidos, rango afectado hasta 4.0.7. El aviso oficial figura sin versión corregida y fue revisado/actualizado el 17 de noviembre. Publicación original: 19 de octubre.
- `npm view picomatch version dist-tags --json` devuelve `latest: 4.0.7`, también afectada. No hay parche estable publicado que aplicar mediante una actualización compatible en esta consulta.
- La instalación usa 4.0.4 en las herramientas Angular/Vite/Vitest y 2.3.2 por la cadena Tailwind. El mismo aviso se propaga a varios paquetes del informe; no representa múltiples vulnerabilidades independientes en la lógica financiera.
- `npm audit --omit=dev --json` termina con código 0 y cero vulnerabilidades conocidas. Esto describe las dependencias de producción reportadas por npm; no certifica la seguridad de toda la aplicación.
- `git diff e2b4bf7 e205152 -- frontend/package.json frontend/package-lock.json` está vacío. Avisos no añadió ni actualizó dependencias; la alerta afecta al árbol preexistente. No se atribuye el fallo al CSS ni se declara falso positivo.
- Las sugerencias automáticas incluyen cambios de versión incompatibles y tampoco ofrecen un arreglo publicado para `picomatch`. No se aplican degradaciones de Angular, migraciones mayores de Tailwind ni sustituciones no verificadas para obtener CI verde.

Evidencia privada: `.local/avisos-audit-current.json`, `.local/avisos-audit-production.json`, `.local/revision-avisos-coherencia/ci-security-failure.json` y `ci-closing.json`. El job Frontend 134431336675 registra la salida 1 de seguridad a 2026-11-17 22:53:15 UTC. Aviso contrastado con la base oficial de GitHub y el registro npm. La revisión visual y sus límites están en [el informe de Avisos](REVISION_AVISOS_COHERENCIA_2026-11-17.md).

## Pendiente concreto

Mantener PR288 en borrador, sin integración ni despliegue manual. Reconsultar versiones y aviso cuando exista parche; aplicarlo en una rama de etapa nueva desde develop comprobado, verificar auditoría de producción/desarrollo, build, unitarias y E2E por SHA. Las comparativas privadas 14382 y 14384 siguen disponibles para valorar el diseño con datos ficticios. La CI fallida no se presenta como aprobada ni se traslada a e205152 la CI de PR287.
