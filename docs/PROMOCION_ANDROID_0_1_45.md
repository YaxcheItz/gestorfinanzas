# Promoción e instalación de Android0.1.45

## Autorización y base

El propietario autorizó integrar el PR273, promover a producción y actualizar el celular conservando datos. La preferencia de comunicación añadida a AGENTS.md se aplica hasta el cierre global de la app; no debe repetirse en cada etapa ni en textos para continuar.

Nueva rama `entrega/android-045-promocion`, worktree `.local/worktrees/android-045-promocion`, creada desde develop remoto comprobado tras integrar PR273: `fe13575532c8c055fe699374660988a888b01f6f`. Su árbol coincide exactamente con la entrega aprobada `278cb4c931ce2cc86d9b8f34ffe8ca3be2e922ed`. El PR271 permanece excluido. No se modifica código de aplicación en esta rama de seguimiento.

## Integración y promoción en curso

PR273 integrado mediante merge, sin sustituir ramas ni modificar su contenido probado. PR274 de develop a main: https://github.com/YaxcheItz/gestorfinanzas/pull/274 . CI develop43360960588/Android43360960646 y CI PR27443361049180/Android43361048150 aprobaron, todas con head fe13575532c8c055fe699374660988a888b01f6f. Después se integró PR274 en main `1fd9402bb40012aba4c894b81ecceb09dcfb48a1`, cuyo árbol coincide exactamente con el head probado. CI final de main43362581605 terminó success con seis trabajos aprobados; Android43362581662 también terminó success. Ambos head_sha coinciden exactamente con el main indicado, comprobado nuevamente con ls-remote antes de instalar. E2E/API, PWA y navegación sintética aprobaron en el trabajo final; no se toma una ejecución anterior como sustituto de esta comprobación.

El backend y sus contratos no difieren entre main inicial3a7e34c y esta entrega. Se usaron los despliegues configurados de main, sin alterar credenciales o ajustes de infraestructura.

Producción verificada: Vercel deployment7756743830, environment Production/state success, y Render7756736059, environment main - kaptal-api/production_environment true/state success, ambos para SHA1fd9402bb40012aba4c894b81ecceb09dcfb48a1. GitHub deja production_environment false en el registro de Vercel aunque declara environment Production; por ello también se corroboró el dominio canónico kaptalgf.vercel.app: capture.css, activity.css y home.css cambiaron frente a la referencia previa y coinciden byte a byte con los blobs Git del nuevo main. La comparación inicial con archivos del checkout Windows difería solo por CRLF/LF y se corrigió para comparar contra Git, sin omitir diferencias de contenido. Health público a través del dominio canónico respondió200/UP después de concluir Render. El health no identifica por sí solo un commit ni acredita operaciones financieras; la identidad del despliegue y los recursos se verificaron separadamente. Solo se leyeron recursos/health públicos, sin finanzas o cuentas.

## Artefacto y controles de actualización

Artefacto existente verificado: `.local/releases/Kaptal-0.1.45.apk`, paquete `com.kaptal.app`, código46, SHA256 `32240a85d2557a2de03a57a2165ec898f3dd4ddcef49eb5d84e91561a85a66fa`, certificado SHA256 `b5f360604095a50f3208299767dcedca2f3acfc5087df8be1fde9cc075c120c3`. Ver `docs/ENTREGA_ANDROID_0_1_45_VISUAL.md` y su cierre en el checkout principal para CI local/remota y comparación de87 recursos.

Con el Samsung autorizado conectado se revalidaron paquete, versión y certificado de ambos APK, y el hash del artefacto. Se actualizó exclusivamente com.kaptal.app del usuario0 con `adb install -r --user 0`, sin desinstalación, borrado de datos ni concesión automática de permisos. Antes:0.1.44/código45. Después:0.1.45/código46; lastUpdateTime cambió y firstInstallTime se conservó exactamente. El SHA256 del base APK efectivamente instalado coincide con32240a85d2557a2de03a57a2165ec898f3dd4ddcef49eb5d84e91561a85a66fa. No hubo fallo de firma ni necesidad de reset.

La instalación solo se ejecutó después de confirmar CI main/Android, ambos despliegues, tres estilos públicos y health200/UP. El instalador privado verificó todos los gates nuevamente; su modo previo de comprobación no instalaba. Evidencia privada: `.local/android-045-install-verification.json`, `.local/android-045-promocion/production-ready.json`, `styles-production.json`, respuestas públicas de health y binario previo para contraste de firma. No se incluyen serial, rutas privadas de paquetes ni configuración de firma en Git. No se abrió la app habitual, leyó su sesión ni consultó/modificó finanzas para comprobar la actualización. Conservar firstInstallTime acredita continuidad de instalación, no prueba por sí solo contenido interno, sesión o comportamiento bancario real.

## Continuación

Promoción e instalación completadas. Esta rama de seguimiento solo modifica instrucciones/documentación, sin alterar la aplicación que se probó/publicó/instaló. Se mantienen las evidencias locales, la versión previa como referencia y los planes sincronizados. No se añadieron tests ni se repitieron builds generales por las actualizaciones documentales; las ejecuciones automáticas de cada merge sí se comprobaron hasta su conclusión.

Siguiente: revisión visual del propietario en la app actualizada y retomar los pendientes funcionales/del plan que indique, conservando calendario aprobado e historial/lentitud/logout aplazados y PR271 excluido. No abrir datos reales por iniciativa del agente ni convertir los resultados sintéticos previos en validación de operaciones productivas.

Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md y docs/PROMOCION_ANDROID_0_1_45.md, además de planes locales. PR273/274 integrados: develop fe13575 y main1fd9402, CI general/Android aprobadas y producción comprobada. Android0.1.45/código46 ya está instalado, hash coincidente y fecha inicial conservada. Sigue con revisión visual del propietario y pendientes del plan; no repetir la entrega ni abrir datos financieros por iniciativa propia».
