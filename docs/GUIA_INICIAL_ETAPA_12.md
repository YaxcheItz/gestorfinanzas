# Etapa 12: primeros pasos omitibles

Incremento posterior a Google nativo 0.1.7, en rama nueva `mejoras/etapa-12-guia-inicial` desde develop remoto verificado `7f6b787ef9c87728510b5b5cf0eeccc8948d4d3a`. CI353 de esa base terminó correctamente. No cierra la Etapa 12 completa.

## Comportamiento

El inicio muestra una guía después del resumen principal: preparar cuentas, registrar con categoría y organizar presupuestos, más un acceso directo a Avisos. Es contenido opcional dentro de la página: no bloquea el inicio ni abre modales; tampoco solicita permisos o activa automatizaciones.

«Omitir guía» devuelve el foco al contenido principal. «Ver primeros pasos» en Configuración permite recuperarla. La elección se recuerda por usuario en este navegador o APK; no se sincroniza entre dispositivos ni se envía al backend. Al cambiar de usuario no se arrastra la omisión de otra cuenta. Si el almacenamiento está bloqueado, la elección sigue funcionando durante la sesión.

Los enlaces llevan a funciones existentes. Texto y voz son opcionales; las automatizaciones requieren configuración y consentimiento explícitos. No se crean cuentas, saldos, movimientos, suscripciones ni conexiones por visitar la guía. Se reutilizan colores y tamaños de control existentes; el rediseño general sigue al final.

## Validación y entrega

Ocho pruebas nuevas del servicio/componente: persistencia, aislamiento de usuarios, cierre de sesión, reapertura, almacenamiento bloqueado y restauración del foco. Suite frontend: 424 correctas. Build web correcto. Diez E2E focalizados de la guía y regresión móvil correctos con servicios locales/datos sintéticos; no QA en producción. El recorrido ampliado de tema claro/oscuro, letra grande, foco al reabrir y título libre del encabezado fijo también pasó.

Android 0.1.8/código9 compilado e instalado como actualización con el certificado release existente y primera instalación 2026-10-22 00:26:31 conservados. El propietario confirmó guía visible, omisión y reapertura correctas en Samsung. APK `.local/releases/Kaptal-0.1.8.apk` y Descargas, SHA256 `979CE4DF15268A19643E14EBA3F0DEFDB8BC8C6BB9400F01A8FE3C7BB5AA4D45`. CI remoto exacto/integración/publicación pendientes al preparar el PR; consultar GitHub para el cierre posterior. No confundir APK instalada con frontend web publicado.

## Santander y siguientes incrementos

El propietario confirmó creada su cuenta Santander, acceso Android concedido y «Registro automático activado» en la release 0.1.7, después de seleccionar cuenta/lista y marcar su consentimiento. Consulta de solo lectura corrobora configuración Santander vigente. También confirmó expresamente que quiere las compras reconocidas de los otros bancos que seleccionó; no revocar esa selección ni ampliar proveedores por iniciativa del asistente. Esto acredita configuración real, todavía no un aviso bancario procesado. La ruta real es selector de lista de la esquina superior izquierda → Herramientas → Bandeja de avisos. Conservar el piloto en `PILOTO_SANTANDER_ANDROID_0_1_7.md` y esperar su próximo aviso habitual, sin compras de prueba.

Pendientes posteriores: privacidad al volver del fondo y en vistas previas, bloqueo/biometría nativos, auditoría accesible amplia, exportación/restauración y mediciones de Etapa 13. No repetir bloqueo/reinicio, widget o accesos ya acreditados sin un motivo concreto. Gmail permanece deshabilitado.
