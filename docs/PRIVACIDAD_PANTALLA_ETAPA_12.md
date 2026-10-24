# Etapa 12: protección nativa de pantalla

Incremento en `mejoras/etapa-12-privacidad-pantalla`, desde develop remoto `f74c097896c660f19297c2611c8d2e30a3a3220f`, comprobado con CI360 correcto. La guía 0.1.8 ya está publicada en main `4f3651e` y documentada en `GUIA_INICIAL_ETAPA_12.md`.

## Comportamiento y alcance

Configuración → Seguridad incorpora «Proteger pantalla en este Android». La opción utiliza `FLAG_SECURE` para proteger el contenido de la ventana frente a capturas y pantallas no seguras. En Android 13/API33 o superior también desactiva explícitamente las capturas de la actividad destinadas a Recientes. No hay un control equivalente ficticio en web/PWA.

Se recuerda una preferencia booleana privada por instalación/perfil Android, sin sincronizarla con el servidor. Normalmente inicia desactivada hasta una acción explícita; si se detecta un error o un tipo inválido al leer la preferencia, el arranque aplica protección. La política se restaura en MainActivity antes de mostrar el contenido, también en la pantalla de acceso. Activar/desactivar la opción no llama a logout ni modifica credenciales, conexiones bancarias, colas, permisos o WorkManager.

El estado visible procede del flag real de la ventana. Mientras no se conoce, o si no puede confirmarse una escritura, no se anuncia «Activada»/«Desactivada»: se ofrece comprobar el estado. Los cambios se serializan; no se acepta otra operación mientras hay una pendiente. El switch tiene nombre accesible estable, estado `aria-checked`, foco visible y un área mínima de 44 px.

Esto protege la presentación de la app; el bloqueo de acceso y la biometría siguen pendientes. No sustituye «Ocultar montos» ni añade defensas contra superposiciones. Android documenta limitaciones de `FLAG_SECURE` en versiones antiguas; compilar desde API24 no equivale a validar todos los fabricantes/versiones. La prueba física de este incremento corresponde al Samsung SM-A546E disponible.

## Contrato del puente y persistencia

- `ScreenPrivacy.read()` devuelve `{ enabled: boolean }` según la ventana actual.
- `ScreenPrivacy.set({ enabled: boolean })` valida un booleano real; rechaza valores ausentes, cadenas, números y null con `INVALID_ARGUMENT`.
- La preferencia se guarda con confirmación antes de aplicar la política en el hilo UI. Si falla, se intenta restablecer la preferencia/política previa y se rechaza la operación; la UI vuelve a estado no confirmado y requiere reconciliación.
- Las llamadas sin actividad válida se rechazan sin revelar detalles internos. No se transportan identidades, importes, claves, notificaciones ni tokens.

## Comprobaciones

Diez pruebas nuevas de servicio/componente: web sin puente, lectura autoritativa, acción explícita, almacenamiento de sesión intacto, carga pendiente, respuesta inválida, fallo con recuperación, serialización y switch accesible. Suite frontend completa: 434 correctas. Build web/debug/release, Android lint/JVM y compilación instrumentada correctos. Diez E2E de regresión local correctos, incluida la ausencia de switch nativo en web; sin QA productiva.

Una instrumentada ejecutada en Samsung, restringida al paquete `.debug`, comprueba lectura/escritura real del flag, cuatro entradas inválidas, persistencia al recrear la actividad, protección ante tipo de preferencia corrupto y recuperación. Compara las preferencias de sesión sin imprimir sus valores y restaura la preferencia debug inicial. Se repitió correctamente tras añadir la API específica de Recientes. Evidencia privada `.local/screen-privacy-device-final.log`; APK de instrumentación retirado y debug detenida al terminar.

Release 0.1.9/código10 compilada e instalada conservando certificado SHA256 `b5f360604095a50f3208299767dcedca2f3acfc5087df8be1fde9cc075c120c3`, datos y primera instalación 2026-10-22 00:26:31. APK `.local/releases/Kaptal-0.1.9.apk` y Descargas, SHA256 `6BFF7E70739FE431F595DECAEE70DF9C7C2F094E719C340CF2E86D94358290E3`. Acceso Android a notificaciones conservado, verificado sin imprimir otros permisos. El propietario activó la opción y confirmó «Capturas bloqueadas y vista de Recientes protegida» en la release; conservar esa preferencia y no desactivarla para obtener capturas de diagnóstico. Esta revisión manual es independiente de la instrumentación.

CI del nuevo HEAD, integración y publicación se comprueban por separado antes de declarar este incremento publicado. No hay nuevas migraciones ni cambios backend. Santander y los otros bancos elegidos permanecen consentidos; el próximo aviso habitual y un solo movimiento real siguen pendientes para cerrar Etapa10. Gmail deshabilitado y diseño general al final.

## Fuentes oficiales consultadas

- [Android: actividades sensibles y FLAG_SECURE](https://developer.android.com/security/fraud-prevention/activities), con alcance y limitaciones.
- [WindowManager.LayoutParams.FLAG_SECURE](https://developer.android.com/reference/android/view/WindowManager.LayoutParams#FLAG_SECURE), disponible desde API1.
- [Activity.setRecentsScreenshotEnabled](https://developer.android.com/reference/android/app/Activity#setRecentsScreenshotEnabled(boolean)), disponible desde API33.
- [SharedPreferences.Editor.commit](https://developer.android.com/reference/android/content/SharedPreferences.Editor#commit()), confirmación de persistencia y atomicidad.
- [Plugins Android de Capacitor v8](https://capacitorjs.com/docs/plugins/android), validación y resolución/rechazo del contrato.
- [Pruebas de actividades Android](https://developer.android.com/guide/components/activities/testing), recreación mediante ActivityScenario.
