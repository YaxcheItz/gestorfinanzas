# Promoción e instalación de Android0.1.45

## Autorización y base

El propietario autorizó integrar el PR273, promover a producción y actualizar el celular conservando datos. La preferencia de comunicación añadida a AGENTS.md se aplica hasta el cierre global de la app; no debe repetirse en cada etapa ni en textos para continuar.

Nueva rama `entrega/android-045-promocion`, worktree `.local/worktrees/android-045-promocion`, creada desde develop remoto comprobado tras integrar PR273: `fe13575532c8c055fe699374660988a888b01f6f`. Su árbol coincide exactamente con la entrega aprobada `278cb4c931ce2cc86d9b8f34ffe8ca3be2e922ed`. El PR271 permanece excluido. No se modifica código de aplicación en esta rama de seguimiento.

## Integración y promoción en curso

PR273 integrado mediante merge, sin sustituir ramas ni modificar su contenido probado. PR274 de develop a main: https://github.com/YaxcheItz/gestorfinanzas/pull/274 . La integración develop activa CI43360960588 y Android43360960646; la promoción PR274 activa CI43361049180 y Android43361048150. Todas corresponden a head fe13575532c8c055fe699374660988a888b01f6f. Al preparar este informe están en curso; no declarar main ni instalación realizados hasta comprobarlos.

El backend y sus contratos no difieren entre main inicial3a7e34c y esta entrega. La promoción utilizará los despliegues configurados de main, sin alterar credenciales o ajustes de infraestructura. Comprobar despliegue de producción y recursos públicos de la versión, además del health público; el health no identifica por sí solo el commit desplegado ni acredita operaciones financieras.

## Artefacto y controles de actualización

Artefacto existente verificado: `.local/releases/Kaptal-0.1.45.apk`, paquete `com.kaptal.app`, código46, SHA256 `32240a85d2557a2de03a57a2165ec898f3dd4ddcef49eb5d84e91561a85a66fa`, certificado SHA256 `b5f360604095a50f3208299767dcedca2f3acfc5087df8be1fde9cc075c120c3`. Ver `docs/ENTREGA_ANDROID_0_1_45_VISUAL.md` y su cierre en el checkout principal para CI local/remota y comparación de87 recursos.

Con el Samsung autorizado conectado: registrar versión/fechas previas, revalidar APK/certificado, actualizar con `adb install -r` y comprobar versión, hash del base APK instalado y continuidad de firstInstallTime. Nunca desinstalar, limpiar datos, cambiar sesión ni leer finanzas reales para esta verificación. La aceptación visual del propietario se distingue de instalar correctamente.

## Continuación

Completar CI de integración/promoción, integrar PR274 con head protegido, comprobar main/producción y actualizar/verificar el teléfono. Registrar SHA/ejecuciones/despliegue/hash instalado y límites; actualizar estado, plan y planes locales, confirmar/subir ramas de seguimiento y verificar sus SHA remotos.

Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/PROMOCION_ANDROID_0_1_45.md, además de planes locales. PR273 ya está integrado en develop fe13575; comprueba PR274 y sus ejecuciones antes de promover e instalar el APK verificado0.1.45. La actualización está autorizada y debe conservar datos/instalación; no abrir finanzas reales».
