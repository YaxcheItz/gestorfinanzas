# Android 0.1.7 y promoción a producción

El propietario utiliza Google para entrar a la APK. La discrepancia entre el proyecto del cliente web anterior y el de los clientes Android impedía obtener la credencial. El propietario configuró el cliente web de su proyecto controlado en Render. No se recrearon sus clientes Android ni se modificó Gmail.

## APK y comprobación física

Release 0.1.7/código8 instalada como actualización de 0.1.6 en Samsung SM-A546E, conservando la firma SHA256 `b5f360604095a50f3208299767dcedca2f3acfc5087df8be1fde9cc075c120c3` y primera instalación 2026-10-22 00:26:31. APK `.local/releases/Kaptal-0.1.7.apk` y Descargas, SHA256 `89A8B40EB6176E2008411B7EC567DBB6103BF8920F622BEA10B51A2D32C8EE03`. Sin borrado de datos.

Pruebas físicas del flujo normal en debug: botón Google, cuenta elegida por el propietario, dashboard y lectura autenticada de cuentas HTTP200/success. El propietario confirmó identidad esperada y explicó que era una cuenta reciente, todavía sin cuentas financieras. También confirmó login correcto en la release instalada. La continuidad de cuentas preexistentes está cubierta por AuthServiceTest aisladas; no se presenta como comprobación física con cuentas inexistentes.

Logout real y cancelación del selector correctos: sesión local eliminada, Atrás devuelve al login, reintento habilitado y ninguna sesión tras cancelar. Debug sin diagnóstico instalada y detenida; release al frente. Evidencia privada de booleanos en `.local/google-normal-flow-result.json` y `.local/google-normal-logout-cancel-result.json`. No se imprimieron tokens ni cuerpos de respuesta de autenticación. No ejecutar el arnés histórico `validate-android-live.cjs`: crea QA en producción.

## Integración y despliegue

#117 integrado en develop `59768f690d0e53e27b77c40756951b5b8e5cdf72`, tras los 14 checks correctos de `86d0b4368b14a18fa0e6a2a94f36bbb2423a730b`: CI347/348, Android39 y Vercel. #116 integrado en main `f4aee67d3ff0f35ce49cc89e35337523e68b0a4d`, tras 15 checks correctos del HEAD develop: CI349/350, Android40/41 y Vercel.

Render registra despliegue exitoso del commit main, entorno `main - kaptal-api`, deployment GitHub `7294549568`. Vercel Production `7294554512` también exitoso. Las integraciones automáticas publicaron de manera independiente; se verificó cada resultado antes de declarar completada la publicación.

Verificación posterior por HTTPS: health HTTP200/UP y cliente Google nuevo en Render directo y proxy Vercel. Lectura productiva de solo lectura confirma V11, V12, V13 y V14 aplicadas; antes de promover estaban pendientes. Manifiesto PWA y hash SHA1 del bundle servido `/main-AMPFRXM3.js` coinciden con la entrega compilada. Evidencias privadas `.local/production-postpromotion-health.json`, `.local/production-promotion-schema.json` y `.local/production-frontend-promotion-result.json`.

CI posterior main: CI351/40066434493 y Android42/40066434483 SUCCESS. Siete checks correctos del commit `f4aee67`, incluidos E2E con API/PostgreSQL y PWA. Se comprobaron por separado despliegue servido y CI posterior.

## Respaldo y límites

Snapshot previo actualizado `.local/promotion-20261024T052812Z/before-main.dump.dpapi`: dump solo lectura, cifrado Windows DPAPI, descifrado/hash y catálogo verificados. Snapshot nuevo no restaurado. Ensayo local anterior de restauración y DDL V11–V14 documentado en `ENTREGA_ANDROID_0_1_6_Y_PROMOCION.md`; no acredita RPO/RTO del proveedor. No se restauraron ni borraron datos productivos.

Autorización permanente del propietario para publicar tras comprobaciones; sustituye aprobaciones separadas históricas. No autoriza destrucción/restauración ni activar Gmail. No QA productiva, compras de prueba ni activación bancaria automática por desplegar.

Piloto Santander preparado en `PILOTO_SANTANDER_ANDROID_0_1_7.md`: configurar cuenta/lista reales con el propietario y esperar su próximo aviso habitual consentido. Etapa10 permanece abierta; onboarding, privacidad/bloqueo, accesibilidad completa y mediciones de Etapas12/13 siguen en ramas nuevas desde develop actualizado, diseño al final.
