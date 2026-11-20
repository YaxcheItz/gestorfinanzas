# Medición temporal de la reapertura Android

La medición del punto 6 registra el paso a primer plano, la preparación de sesión, los estados visibles de la WebView y los tiempos de las lecturas de Inicio. Los eventos quedan en Logcat del dispositivo bajo la etiqueta `KaptalArranque`. Cada entrada contiene una fase de una lista fija y milisegundos desde `MainActivity.onResume`. Las respuestas de renovación, perfil, listas y resumen incluyen además código HTTP y duración de la solicitud.

El código 0 representa un fallo de transporte sin respuesta HTTP. Los estados visibles se detectan por su elemento en la WebView. `inicio_datos` puede aparecer al reanudar una vista que ya estaba dibujada. Cada entrada a primer plano emite una marca inicial y abre una ventana de hasta cinco minutos para 64 eventos posteriores. La captura termina al salir de primer plano. El plugin acepta etiquetas y rangos numéricos cerrados. Registra los tiempos localmente y deja fuera URLs, consultas, cuerpos, credenciales e identificadores.

## Compilaciones

- `kaptalStartupTiming=true` activa el plugin de diagnóstico. En debug usa el paquete aislado `com.kaptal.app.qa.arranque`. Una compilación habitual omite la opción.
- La APK aislada verificada está en `.local/medicion/kaptal-qa-arranque.apk`. Su copia de pruebas usa respuestas ficticias interceptadas y se valida tras instalar y retirar el paquete temporal.
- Los candidatos de entrega se compilaron sobre `32e0ee804fc14e103191ae4f7faf7163cffd0d8b`, correspondiente al binario 0.1.46 (47) cuyo SHA-256 se comparó con el APK instalado. Ambos mantienen `com.kaptal.app` y el HTTP nativo. El código 48 activa la captura y el código 49 permite retirarla con una actualización. Los archivos y hashes están en `.local/medicion/` del worktree.
- Para ensayar la instalación habitual, ambos candidatos requieren la firma de la versión instalada y se debe verificar el certificado antes de actualizar. Instalar el código 48 con `adb install -r` cuando el propietario autorice esa actualización. Después de capturar, el código 49 firmado permite desactivar el registro mediante otra actualización y conservar datos y sesión.

## Ensayo del 19 de noviembre

Se verificó la identidad de firma y se instalaron en secuencia los códigos 48 y 49. El Samsung quedó en 0.1.46 (49) con la captura apagada. La primera apertura con la 48 alcanzó los datos de Inicio a los 5480 ms desde primer plano. Los dos resúmenes observados se solaparon. El resultado, los hashes y la continuidad de instalación figuran en `docs/ESTADO_SESION.md` y `.local/medicion/`. Para otro ensayo con el paquete habitual, crear nuevos candidatos con códigos superiores a 49.

## Ensayo del 20 de noviembre

Se firmaron las APK 50 y 51, que conservan el código web de la 49, y se instalaron en secuencia con autorización del propietario. La primera apertura con la 50 mostró los datos de Inicio en 6.488 s, tras 9 h 11 min desde la última salida registrada con la 49. La captura quedó apagada después de instalar la 51. Los hashes, la continuidad de instalación y las fases figuran en `.local/medicion/proxima-reapertura/` y en `docs/ESTADO_SESION.md`.

## Espera en curso con la 52

El 20 de noviembre se firmaron la 52 y la 53 y se verificó que el certificado y los archivos de ambas coinciden con los esperados. La 52 se instaló a las 10:12:03 y la salida de Kaptal quedó registrada a las 10:12:42, hora de Ciudad de México. La primera apertura registró las marcas de primer plano e Inicio con datos. La reapertura que mide la espera queda disponible desde las 16:12:42.

El proceso local `esperar-reapertura.ps1` espera seis horas desde la última salida y puede abrir Kaptal una vez hasta las 18:12:42 si el Samsung está conectado, desbloqueado y en Inicio de Android. La copia instalada, su fecha de actualización y su SHA-256 deben coincidir con la 52 verificada. Consultar `.local/medicion/misma-instalacion/seguimiento-52.json` antes de realizar una apertura manual. La APK 53 de retorno está firmada y se conserva en la misma carpeta para después de validar la muestra.

## Próxima reapertura

La 51 tiene apagadas las marcas internas. ADB puede medir el arranque de Android y el propietario puede anotar cuándo aparecen Inicio y sus datos. Para medir también sesión, perfil, listas y resumen, se prepararon la 52 con captura y la 53 de retorno en `.local/medicion/misma-instalacion/`. Antes de instalar una versión de diagnóstico, verificar su certificado y preparar la APK de retorno con la autorización del propietario.

Tras elegir el APK para la prueba, abrir Kaptal una vez y salir a Inicio de Android. La espera cuenta desde que Android registra la salida de Kaptal con esa misma instalación. Mantener ese APK hasta terminar la medición. La referencia es de seis horas, cercana al intervalo de la primera reapertura lenta.

Para comprobar por ADB el APK instalado y el inicio del intervalo, ejecutar desde el worktree con `-Codigo 51` o `-Codigo 52` según corresponda.

```powershell
powershell.exe -NoProfile -File .local/medicion/misma-instalacion/medir.ps1 -Codigo 52
```

Tras el intervalo, añadir `-Capturar` con el Samsung despierto y desbloqueado. El script comprueba que la última entrada y salida ocurrieron después de instalar el APK, registra los tiempos nativos y compara el SHA-256 y la fecha de actualización antes y después. Con la 52 recoge también la ventana de `KaptalArranque`. El JSON queda en la misma carpeta local. La ejecución de comprobación en la 51 confirmó que la última salida correspondía a la 50 y bloqueó una apertura prematura.

Con el diagnóstico autorizado e instalado, dejar Kaptal fuera de primer plano durante un periodo habitual de varias horas. Abrir la captura en Windows antes de reanudar Kaptal.

```powershell
$adb = Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe'
& $adb -d shell "logcat -T 1 -v raw -s 'KaptalArranque:I' '*:S'"
```

Conservar únicamente el bloque que empieza en `phase=primer_plano elapsed_ms=0`. En paralelo, `am start -W` registra tiempo y estado nativos. Apuntar por separado cuándo ve el propietario Inicio y sus datos. Comparar los hitos con la renovación, la lista activa y el resumen registrados. La prueba de salud pública se hace después de esa apertura para respetar el estado previo del servicio.

## Análisis de la captura

Cuando el seguimiento termine, abrir el JSON `reapertura-52-*.json` en la carpeta local del ensayo. Confirmar `mismoApkEnUltimoUso`, `instalacionVerificada` y una sola ventana diagnóstica. Usar la ruta del archivo guardado para ejecutar el resumen.

```powershell
python tools/operacion/resumir_reapertura_android.py RUTA_DEL_JSON
```

Comparar el tiempo de Android con la primera aparición de Inicio, la carga y los datos. Revisar código HTTP y duración de cada petición. Los inicios y solapamientos se estiman a partir de la marca registrada y la duración, por lo que dos peticiones simultáneas no se suman como si fueran consecutivas. Si la WebView ya tenía datos visibles al volver, una petición posterior puede corresponder a una recarga. El bloqueo o el error de Inicio pueden dejar ausente la marca de datos.

La duración HTTP incluye el recorrido observado por el cliente. Atribuir una demora a Vercel o Render requiere correlacionar la hora con evidencia de esos servicios. La apertura de la 50 sirve para comprobar el resumen y comparar hitos, con el antecedente de que ocurrió tras instalar esa APK. Una sola reapertura aporta una muestra individual.

[Plugins Android de Capacitor](https://capacitorjs.com/docs/plugins/android) · [Logcat](https://developer.android.com/tools/logcat)
