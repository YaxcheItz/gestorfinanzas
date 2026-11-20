# Medición temporal de la reapertura Android

La medición del punto 6 registra el paso a primer plano, la preparación de sesión, los estados visibles de la WebView y los tiempos de las lecturas de Inicio. Los eventos quedan en Logcat del dispositivo bajo la etiqueta `KaptalArranque`. Cada entrada contiene una fase de una lista fija y milisegundos desde `MainActivity.onResume`. Las respuestas de renovación, perfil, listas y resumen incluyen además código HTTP y duración de la solicitud.

El código 0 representa un fallo de transporte sin respuesta HTTP. Los estados visibles se detectan por su elemento en la WebView. `inicio_datos` puede aparecer al reanudar una vista que ya estaba dibujada. Cada entrada a primer plano emite una marca inicial y abre una ventana de hasta cinco minutos para 64 eventos posteriores. La captura termina al salir de primer plano. El plugin acepta etiquetas y rangos numéricos cerrados. Registra los tiempos localmente y deja fuera URLs, consultas, cuerpos, credenciales e identificadores.

## Compilaciones

- `kaptalStartupTiming=true` activa el plugin de diagnóstico. En debug usa el paquete aislado `com.kaptal.app.qa.arranque`. Una compilación habitual omite la opción.
- La APK aislada verificada está en `.local/medicion/kaptal-qa-arranque.apk`. Su copia de pruebas usa respuestas ficticias interceptadas y se valida tras instalar y retirar el paquete temporal.
- Los candidatos de entrega se compilaron sobre `32e0ee804fc14e103191ae4f7faf7163cffd0d8b`, correspondiente al binario 0.1.46 (47) cuyo SHA-256 se comparó con el APK instalado. Ambos mantienen `com.kaptal.app` y el HTTP nativo. El código 48 activa la captura y el código 49 permite retirarla con una actualización. Los archivos y hashes están en `.local/medicion/` del worktree.
- Para ensayar la instalación habitual, ambos candidatos requieren la firma de la versión instalada y se debe verificar el certificado antes de actualizar. Instalar el código 48 con `adb install -r` cuando el propietario autorice esa actualización. Después de capturar, el código 49 firmado permite desactivar el registro mediante otra actualización y conservar datos y sesión.

## Próxima reapertura

Con el diagnóstico autorizado e instalado, dejar Kaptal fuera de primer plano durante un periodo habitual de varias horas. Abrir la captura en Windows antes de reanudar Kaptal.

```powershell
$adb = Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe'
& $adb -d shell "logcat -T 1 -v raw -s 'KaptalArranque:I' '*:S'"
```

Conservar únicamente el bloque que empieza en `phase=primer_plano elapsed_ms=0`. En paralelo, `am start -W` registra tiempo y estado nativos. Apuntar por separado cuándo ve el propietario Inicio y sus datos. Comparar los hitos con la renovación, la lista activa y el resumen registrados. La prueba de salud pública se hace después de esa apertura para respetar el estado previo del servicio.

[Plugins Android de Capacitor](https://capacitorjs.com/docs/plugins/android) · [Logcat](https://developer.android.com/tools/logcat)
