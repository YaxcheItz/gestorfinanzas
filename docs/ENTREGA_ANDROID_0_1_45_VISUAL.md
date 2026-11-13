# Android 0.1.45: preparación de entrega visual

Rama `entrega/android-045-visual`, worktree `.local/worktrees/android-045-visual`, desde `origin/develop` comprobado `74a85bb60a7301e38198fa7245d817d57d85f82b` e incorporando `35113c26a468e2551e7efcfbe50ae3214521b4fb` por fast-forward. En la comprobación inicial develop y main (`3a7e34c5f79e725cb86bc4ef6121f617e8d408b5`) tienen el mismo árbol de archivos aunque difiera su historial. El head del PR271 (`fec83cf788658a3f22d7ffa84b9da8dfe3b5c853`) no es ancestro de esta entrega; no se incorpora ese PR ni otros PR abiertos.

Incluye las mejoras acumuladas de chat, formularios, dock/paginación, estados de carga/error, contraste, teclado, fechas, selección y gráficos, con la corrección posterior de E2E. No cambia backend, contratos API ni cálculos financieros respecto de la base. El cambio de esta etapa en aplicación es exclusivamente `versionName`0.1.44→0.1.45 y `versionCode`45→46. Calendario aprobado e historial/lentitud/logout aplazados; chat sin borradores persistentes. TalkBack queda expresamente para lo último por decisión del propietario.

## Verificación local y artefacto

| Comprobación | Resultado |
|---|---|
| Build web | Aprobado; avisos CSS anteriores de Avisos4,49kB/automatic-bank5,01kB conservados |
| Frontend | 571 pruebas/65 archivos aprobados |
| Dependencias frontend | 4 pruebas del verificador aprobadas; auditoría actual sin vulnerabilidades conocidas en producción/desarrollo |
| Android JVM | 29 pruebas, cero fallos/errores/omitidos |
| Lint debug y release | Cero errores/fatales;23 advertencias y1 hint por variante conservados |
| Gradle | Release firmada y APK de instrumentación construidas;339 tareas ejecutadas |
| Identidad | `com.kaptal.app`,0.1.45/código46, sin `debuggable` |
| Firma | `apksigner verify` aprobado; certificado coincide con el APK0.1.44 instalado |
| Recursos | 87 archivos del build web coinciden byte a byte con los recursos empaquetados |
| Configuración | Recursos locales, sin `server.url`, HTTP nativo activado y depuración web desactivada; sin puerta/dominio de QA |

APK preparada en `.local/releases/Kaptal-0.1.45.apk` del checkout principal. SHA256 `32240a85d2557a2de03a57a2165ec898f3dd4ddcef49eb5d84e91561a85a66fa`, tamaño5166125 bytes. Certificado SHA256 `b5f360604095a50f3208299767dcedca2f3acfc5087df8be1fde9cc075c120c3`. Firma usada mediante la configuración local existente, cargada solo en el entorno del subproceso; no se copian claves/contraseñas al repositorio ni al informe. La comparación se hizo con el binario instalado de la app habitual, sin abrir su sesión ni sus datos.

El primer lint falló por el separador de unidad sin escapar en `android/local.properties`, generado por el arnés local. Se corrigió ese archivo ignorado; Gradle reutilizaba el informe previo y se regeneraron las comprobaciones con `--rerun-tasks`, aprobando. Un intento intermedio del helper desde otro cwd no llegó a Gradle; se fijó su raíz a la ubicación del script. No se modificaron reglas/baselines ni se suprimieron avisos. Los cambios automáticos de rutas Gradle por el enlace local de node_modules se restauraron; no forman parte de la entrega.

Las pruebas físicas previas de `docs/ANDROID_ACCESIBILIDAD_SECCIONES_2026-11-12.md` corresponden al código web acumulado en una APK QA distinta:44 combinaciones DOM, teclas Android inyectadas, capturas nativas y texto/giro efectivos. No se presentan como instalación o aceptación del APK release0.1.45. No se vuelven a realizar compras, operaciones productivas ni QA financiero.

## CI y alcance de cierre

Se prepara un PR en borrador hacia develop para ejecutar CI general y el workflow Android sobre esta entrega. Al redactar este commit todavía no hay conclusión remota de esta versión. El cierre de SHA, PR y ejecuciones se registra en el estado/plan del checkout principal y planes locales, evitando cancelar comprobaciones mediante pushes documentales sucesivos; el PR se actualizará con sus resultados. No presentar la CI anterior de e24dd9e como verificación exacta de0.1.45.

En esta etapa no se integra, despliega, publica una release ni instala la APK habitual. El teléfono mantiene0.1.44/código45 al preparar la entrega. Antes de actualizarlo, deben comprobarse el cierre de CI, la integración/promoción aplicable y la autorización para la actualización; conservar sesiones/datos y nunca desinstalar la app habitual para superar un fallo de firma.

Para continuar: «Lee AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md, docs/ENTREGA_ANDROID_0_1_45_VISUAL.md y los planes locales. Comprueba SHA/PR/CI de entrega/android-045-visual y el hash de Kaptal-0.1.45.apk antes de promover o instalar. TalkBack al final; conservar datos reales, calendario e historial/lentitud/logout aplazados y excluir PR271».
