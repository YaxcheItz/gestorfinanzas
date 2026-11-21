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

## Preparación y espera con la 52

El 20 de noviembre se firmaron la 52 y la 53 y se verificó que el certificado y los archivos de ambas coinciden con los esperados. La 52 se instaló a las 10:12:03 y la salida de Kaptal quedó registrada a las 10:12:42, hora de Ciudad de México. La primera apertura registró las marcas de primer plano e Inicio con datos. Con esa primera salida, el umbral de seis horas quedaba a las 16:12:42.

El seguimiento automático tenía como límite las 18:12:42 y terminó sin guardar una captura real. Se registró su estado a las 22:33:54. ADB confirmó otra apertura a las 17:08:26 y otra salida a las 17:08:27 bajo la misma 52. La consulta posterior de Logcat devolvió cero marcas de esa apertura. Con esa salida, el nuevo umbral era a las 23:08:27 del 20 de noviembre, hora de Ciudad de México. La APK 53 firmada de retorno quedó preparada en la misma carpeta.

## Reapertura habitual del 20 de noviembre · punto 6

A las 23:08:37, hora de Ciudad de México, Android registró el comienzo de la reapertura medida en el Samsung SM-A546E. Habían pasado 6 h 00 min 10 s desde la salida de las 17:08:27. El proceso ya existía. Antes y después coincidieron la primera instalación (2026-10-22 00:26:31), la actualización de la 52 (2026-11-20 10:12:03) y el SHA-256 de la copia instalada, `4eb92eda4af7bb33f3396cae899e9188506a99842282f6a4c3a17b5384df35fd`.

`medir.ps1 -Codigo 52 -Capturar` se ejecutó una vez. El JSON original registró dos entradas a primer plano y el capturador lo rechazó. Los eventos de Android identifican el lanzamiento de ADB a las 23:08:36.922, la primera reanudación a las 23:08:37.499, la pausa a las 23:08:45.427 y la segunda reanudación a las 23:08:59.697. La marca de datos de la primera ventana quedó registrada antes de la pausa, a las 23:08:41.526. Se conservó el JSON original y se guardó aparte el de la primera ventana con 14 marcas y la referencia a las trazas. El resumidor confirmó una sola ventana y cero líneas descartadas.

| Fase | Tiempo observado |
| --- | --- |
| Arranque Android | `WARM`, `TotalTime` 887 ms y `WaitTime` 905 ms |
| WebView y sesión | JavaScript a los 1110 ms, sesión nativa preparada a los 1153 ms e indicador de sesión a los 1311 ms |
| Renovación | HTTP 200 en 886 ms, respuesta registrada a los 2180 ms |
| Inicio y carga | Inicio a los 2375 ms e indicador de carga a los 2376 ms |
| Perfil | HTTP 200 en 414 ms, respuesta registrada a los 2601 ms |
| Listas | HTTP 200 en 920 ms, respuesta registrada a los 3107 ms |
| Resumen | Dos HTTP 200 en 1499 y 1319 ms, con respuestas registradas a los 3830 y 3933 ms y 1216 ms de solapamiento estimado |
| Datos visibles en la WebView | 4030 ms desde `onResume`, 97 ms después de la última respuesta de resumen |

Los hitos de la WebView se cuentan desde `onResume` y las duraciones HTTP corresponden al cliente. La demora previa de 21 s no se reprodujo. Para atribuirla a una fase o a un servicio hacen falta trazas del mismo intervalo.

La evidencia quedó en `.local/medicion/misma-instalacion/` de este worktree.

- `reapertura-52-20261120-230912.json` conserva el resultado original con dos ventanas. `actividad-52-20261120-230837.log` y `fases-con-hora-52-20261120-230837.log` conservan las marcas para identificar la primera.
- `reapertura-validada-52-20261120-230912.json` y `resumen-reapertura-52-20261120-230912.json` contienen la primera ventana y su análisis. Las comprobaciones ADB están en `comprobacion-previa-52-20261120-230833.json` y `comprobacion-posterior-52-20261120-230912.json`.
- `instalacion-53.json` acredita el retorno por actualización a Kaptal 0.1.46 (53) a las 23:11:43. El APK instalado coincidió con el SHA-256 firmado `2135443c1d6c0c90258a2812511207d2efd22dd319fbcfe146c71999f5a4df13`. El certificado coincidió con la 52 y se comprobó en el DEX que la actividad omite el registro y las llamadas del diagnóstico. Android conservó la primera fecha de instalación y el permiso de avisos, con `BankNotificationListener` activo.

## Procedimiento de captura

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

Después de capturar, abrir el JSON `reapertura-52-*.json` en la carpeta local del ensayo. Confirmar `mismoApkEnUltimoUso`, `instalacionVerificada` y una sola ventana diagnóstica. Usar la ruta del archivo guardado para ejecutar el resumen.

```powershell
python tools/operacion/resumir_reapertura_android.py RUTA_DEL_JSON
```

Comparar el tiempo de Android con la primera aparición de Inicio, la carga y los datos. Revisar código HTTP y duración de cada petición. Los inicios y solapamientos se estiman a partir de la marca registrada y la duración, por lo que dos peticiones simultáneas no se suman como si fueran consecutivas. Si la WebView ya tenía datos visibles al volver, una petición posterior puede corresponder a una recarga. El bloqueo o el error de Inicio pueden dejar ausente la marca de datos.

La 52 conserva la versión web anterior a la corrección de periodo equivalente de `de0b913`. Si aparecen dos respuestas de resumen, registrar sus duraciones y el solapamiento. El registro de fases omite el rango consultado. Para determinar si ambas peticiones usan las mismas fechas, usar la prueba aislada de periodo equivalente.

La duración HTTP incluye el recorrido observado por el cliente. Atribuir una demora a Vercel o Render requiere correlacionar la hora con evidencia de esos servicios. La apertura de la 50 sirve para comprobar el resumen y comparar hitos, con el antecedente de que ocurrió tras instalar esa APK. Una sola reapertura aporta una muestra individual.

[Plugins Android de Capacitor](https://capacitorjs.com/docs/plugins/android) · [Logcat](https://developer.android.com/tools/logcat)
