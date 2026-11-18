# Publicación web de Avisos, Cuentas y Presupuestos

18 de noviembre de 2026.

El propietario confirmó la integración en `develop` y la publicación web desde `main`. La entrega reúne la mejora de legibilidad en Avisos, los cambios de formularios y confirmaciones en Cuentas, y el ajuste de selectores e importes en Presupuestos. Se conserva calendario. Historial, lentitud y logout siguen aplazados. [Revisión conjunta con datos ficticios](REVISION_CONJUNTA_AVISOS_CUENTAS_PRESUPUESTOS_2026-11-18.md).

## Integración

`develop` avanzó a `b0dc3a023ff9c1ae17ca87ce158effa137c20306`. El merge de promoción `01135ec135bdf03ffc08aec7ca4e4e66f2e2620a` quedó en `main`. Verificamos ambos SHA en GitHub. El árbol `74ce7f78f7390004525ca84bce3a605844e69ee5` coincide en las dos ramas con el candidato que aprobó los seis trabajos de CI. La promoción incorpora el código de interfaz y sus pruebas. Backend, calendario, fuente Android y configuración de despliegue conservan el contenido del `main` anterior `73fe866`. [Candidato aprobado](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44379497495) · [Merge publicado](https://github.com/YaxcheItz/gestorfinanzas/commit/01135ec135bdf03ffc08aec7ca4e4e66f2e2620a).

## Despliegues y comprobaciones públicas

Vercel Production `7894422257` y Render `7894403101` registraron éxito para `01135ec`. [Vercel](https://github.com/YaxcheItz/gestorfinanzas/deployments/Production) · [Render](https://github.com/YaxcheItz/gestorfinanzas/deployments).

Después de los despliegues, Inicio, Avisos, Cuentas y Presupuestos devolvieron HTTP 200. Coincidieron por SHA-256 los 12 recursos iniciales y los tres archivos JavaScript de las secciones publicadas. `/api/health` respondió HTTP 200 y `UP` desde el dominio público y directamente en Render. Fueron lecturas públicas. Los hashes, estados HTTP y registros de despliegue se conservan en `.local/publicacion-web-avisos-cuentas-presupuestos/`. [Kaptal web](https://kaptalgf.vercel.app).

## CI de las ramas integradas

La CI de `develop` y la de `main` aprobaron los seis trabajos. La primera ejecución de `main` aprobó 182 pruebas de navegador con cuatro omitidas. El chequeo de arranque de PWA falló antes de ejecutar su suite: la renovación ficticia respondió 401 y se observaron dos solicitudes de catálogos sin cabecera de autorización donde se esperaban cero. El mismo chequeo aprobó 12 veces con el candidato y 12 con el `main` anterior en Chromium local con datos ficticios. El segundo intento del trabajo de `main` aprobó los flujos con PostgreSQL, el arranque, las cuatro pruebas de PWA y la navegación sintética sobre el mismo commit. [CI de develop](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44384249618) · [Primer intento de main](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44384278723/attempts/1) · [Segundo intento de main](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44384278723/attempts/2).

Las compilaciones de Android de ambas ramas aprobaron en GitHub Actions. El alcance autorizado fue la publicación web. [Android de develop](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44384249734) · [Android de main](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44384278476).

## Continuidad

La rama de cierre es `entrega/publicacion-web-avisos-cuentas-presupuestos` en `.local/worktrees/kaptal-publicacion-web`. La instalación de APK requiere confirmación independiente. Las próximas comprobaciones de la interfaz deben usar datos ficticios. El detalle visual de Cuentas al 200 % quedó documentado en el informe de revisión.
