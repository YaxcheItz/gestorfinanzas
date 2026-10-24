# Android 0.1.6 y preparación de promoción

## Entrega Android

Rama `entrega/android-accesibilidad-apk-0-1-6`, nueva desde develop revalidado `81b929354c0025f5e50305505924027db691f7f2`. Versión 0.1.6/código 7. Corrige el script de firma en Windows PowerShell para que avisos de javac no aborten un Gradle correcto; se sigue comprobando su código de salida. No se ignoran errores de compilación.

APK `.local/releases/Kaptal-0.1.6.apk`, alias `.local/releases/kaptal-release.apk` y copia en Descargas/Kaptal-0.1.6.apk. SHA256 `7B857FC587656E850C6EAC330207BF308B59AF5E24025EC650A43E3122D0B875`. Certificado SHA256 `b5f360604095a50f3208299767dcedca2f3acfc5087df8be1fde9cc075c120c3`, idéntico a 0.1.4. Instalada con actualización sobre `com.kaptal.app`; versión/código y proceso de arranque comprobados. Fecha original de instalación conservada: 2026-10-22 00:26:31; actualización comprobada 2026-10-23 21:09:58 (hora del teléfono). No se borraron datos ni se activó el registro bancario de la release. El backend público sigue en la versión anterior hasta promoción aprobada.

## Revisión física adicional

En Kaptal Pruebas con H2 aislada: fontScale 1.5, paisaje y retrato, importe sintético de borrador conservado y control de cierre accesible. Dictar sin escucha automática. No se guardó el borrador. Evidencia `.local/android-layout-0-1-6.txt` y captura privada. Se corrigió la medición del arnés para no confundir viewport reducido por teclado con orientación física y se esperó a que terminara el cambio de configuración de Android; sin cambios funcionales en la app.

El propietario confirmó que TalkBack pronuncia claramente Correo electrónico, Contraseña e Iniciar sesión. Alcance: controles de login de debug; esto no acredita una auditoría completa de lector de pantalla de todas las vistas. La pérdida temporal de USB impidió la primera restauración automática; al reconectar se restauraron y releyeron todos los valores originales de accesibilidad, letra y rotación. Debug detenida. Evidencias `.local/talkback-confirmed.txt`, `.local/talkback-restored.txt` y snapshot privado de ajustes.

Fixture de accesibilidad cerrada correctamente: una prueba, cero fallos/errores, cero conexiones Android/movimientos del usuario efímero; backend 18082 apagado y credenciales eliminadas. No repetir las pruebas previas de configuración, ciclo físico o deduplicación sin nuevo motivo.

## Promoción preparada; aún no publicada

Main revalidado `d39d89952a18959511032880457aaccff4bb5f66`; revisar de nuevo antes de promover. Incluye cambios integrados de Android/captura y Etapa 11, además de V11 (partes), V12 (metas), V13 (trazabilidad de divisas) y V14 (conexiones Android). Historial productivo leído sin modificar: V1–V10.

Respaldo fresco de esquema productivo cifrado con Windows DPAPI: `.local/promotion-20261024T031307Z/before-main.dump.dpapi`. Dump consistente, descifrado/hash y catálogo de pg_restore verificados. No se publicó el dump ni datos, IDs, tokens o credenciales. Evidencia privada adicional en ese directorio.

Restauración ensayada en una instancia temporal local de PostgreSQL 17, solo loopback 15434; el rol de la QA existente 15433 no permitía crear bases y se mantuvo sin cambios. Se aplicaron V11–V14 sobre la restauración: todas las columnas/datos preexistentes conservaron sus huellas, cero conexiones Android nuevas. La base temporal se eliminó, el servidor se detuvo y el directorio de datos restaurados se retiró. `summary.json` contiene comprobaciones sin datos personales. El intento inicial de cluster vacío quedó detenido; no contiene el respaldo restaurado. No se tocó el PostgreSQL habitual 5432 ni se escribió en producción.

Esta prueba no ejecuta Flyway ni arranca servicios sobre el clon: prueba restauración y compatibilidad de los DDL con el snapshot real. Flyway, migraciones y recuperación con datos sintéticos están cubiertos por el gate CI del HEAD que se vaya a promover. El respaldo debe refrescarse si cambia el estado productivo o pasa tiempo antes del despliegue.

Orden preparado: integrar esta entrega a develop tras checks del HEAD exacto; PR de promoción develop → main con CI/Android correctos; aprobación separada para main/producción; backend primero, luego frontend; comprobar versión servida/HTTPS, instalación Android y configuración sin importar avisos anteriores. No activar Gmail ni recrear QA en producción. No dar por probado HTTPS o banco real mediante H2 interceptada.

Rollback no automático: detener entradas, evaluar datos creados tras la promoción y recuperar el snapshot únicamente con autorización específica, evitando perder movimientos posteriores. No borrar datos productivos ni asumir que volver al código antiguo revierte las migraciones. La recuperación local acredita el archivo, no RPO/RTO del proveedor ni un rollback productivo realizado.

## Piloto y etapas siguientes

Piloto con próxima notificación real consentida del banco elegido, sin generar una compra por iniciativa del asistente: verificar formato, asociación, un solo movimiento y comportamiento del envío/reintento. No prometer los cuatro formatos recordados sin muestra real. La configuración de cinco proveedores no acredita soporte universal. Etapa 10 permanece abierta hasta HTTPS y piloto reales.

Después, en ramas nuevas desde develop: Etapa 12 (onboarding breve/omitible, privacidad al volver del fondo, soporte nativo real de bloqueo/biometría, accesibilidad completa y exportación/restauración) y Etapa 13 (mediciones p95/bundle/colas, costes/cuotas reales y operación). La revisión de login con TalkBack y el ensayo de respaldo no equivalen al cierre completo de esas etapas. Diseño al final. Main y producción no se modifican sin la aprobación separada acordada.
