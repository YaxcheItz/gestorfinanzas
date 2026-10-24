# Piloto Santander con Android 0.1.7

Preparación del piloto consentido; todavía no acredita un aviso bancario real procesado. Etapa 10 permanece abierta hasta verificarlo. No realizar compras para probar ni importar avisos anteriores.

## Requisitos

- Release 0.1.7/código8 instalada con firma original y login Google habitual confirmado por el propietario.
- Backend promovido y verificado por HTTPS, migración V14 aplicada y endpoints Android disponibles. El cambio de GOOGLE_CLIENT_ID por sí solo no satisface este requisito.
- Cuenta Santander propia activa y lista elegidas por el propietario. Si todavía no existen, completar la configuración real con él; no crear cuentas QA ni inventar saldo, límite, fechas o terminación de tarjeta.
- App Santander instalada: paquete admitido `mx.bancosantander.supermovil`, observado en Samsung. Esto no prueba que su formato real coincida con el parser.

## Configuración y siguiente aviso habitual

1. En Kaptal, abrir la configuración de avisos bancarios y leer el alcance de acceso a notificaciones. Elegir Santander, su cuenta y lista correctas; completar solo los datos realmente conocidos.
2. El propietario concede el acceso Android y activa el registro automático de forma explícita. No activar otros bancos ni Gmail. Confirmar que la conexión al servidor se completó; un error no equivale a activación.
3. Esperar el próximo aviso habitual de una compra real que el propietario ya fuera a realizar. No generar una compra de prueba, reenviar avisos antiguos ni reproducir eventos contra producción.
4. Comprobar privadamente que el formato es reconocido, la asociación cuenta/lista es correcta y aparece exactamente un movimiento con los datos del aviso. No publicar cuerpo del aviso, terminación, correo, token ni datos bancarios en chat, logs o Git.
5. Si queda en revisión o es rechazado, conservar el estado y revisar la causa antes de registrar nada manualmente; evitar duplicar una operación ya aceptada. No ampliar reglas por una descripción recordada sin evidencia.

## Evidencia y cierre

Registrar en estado/plan únicamente fecha, versión, proveedor y resultados booleanos: HTTPS, configuración consentida, formato reconocido, asociación correcta y un solo movimiento. Datos concretos permanecen privados. No repetir bloqueo/reinicio o deduplicación sintéticos ya aprobados sin un motivo nuevo.

Si se pausa, revoca o cierra sesión, la app elimina clave/reglas/cola locales según el contrato documentado; una petición ya aceptada por el servidor puede haber terminado. No borrar movimientos, restaurar respaldos ni repetir compras para compensar fallos. Consultar `ANDROID_REGISTRO_AUTOMATICO_ETAPA_10.md` y `VALIDACION_ANDROID_CONFIGURACION_ACCESOS.md`.

El piloto no cierra las Etapas 12/13: onboarding, privacidad/bloqueo nativo, accesibilidad completa y mediciones de operación siguen en ramas nuevas desde develop actualizado; diseño al final.
