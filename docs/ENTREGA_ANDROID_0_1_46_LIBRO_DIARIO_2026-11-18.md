# Kaptal Android 0.1.46 · Libro diario

18 de noviembre de 2026.

## Compilación y actualización

La rama `entrega/android-046-libro-diario` parte de `develop` en `5503c57f0c85af03cbe4d7a1a3cca13e81e26b51`. El único cambio de producto es el incremento de versión de Android. La compilación web incluida corresponde al árbol publicado `0c5cf2e42de2e5b91134f7bc2a9ffe85a19e3603`. La CI general y Android de `main` en `81acd45` aprobaron. La APK 0.1.46 se compiló y firmó localmente. [Publicación web](https://github.com/YaxcheItz/gestorfinanzas/blob/bf3c7c50ec09b24844db5e954961ba6c716cf1d3/docs/PUBLICACION_LIBRO_DIARIO_2026-11-18.md) · [CI general](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44447825762) · [CI de Android](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44447825718).

Angular compiló y pasaron 586 pruebas. Gradle aprobó 29 pruebas unitarias JVM, lint de debug y release, y la compilación de release y de la APK de instrumentación. Los primeros intentos de lint conservaron un diagnóstico de escape de la ruta local del SDK en Windows. La ejecución satisfactoria cargó el SDK desde el entorno y recalculó las tareas. Angular mantiene tres avisos previos de presupuesto CSS.

La actualización in situ de `com.kaptal.app` en el Samsung SM-A546E con Android 16 pasó de 0.1.45 (46) a 0.1.46 (47). Android conservó la primera instalación del 22 de octubre a las 00:26:31 y registró la actualización el 18 de noviembre a las 21:35:43. Coincidieron la firma con la versión anterior y el SHA-256 de la APK instalada con el de la APK firmada. Los 87 recursos web de la compilación coinciden byte a byte con los incluidos en la APK. El archivo inicial es `main-J4J56AHM.js`. La compilación de release usa recursos web empaquetados y WebView sin depuración.

- APK local en `.local/releases/Kaptal-0.1.46.apk`.
- SHA-256 `2bf83313b3532c5ae618ac8321ed2efbf7f1012dfa1bb8d0fd7c130382b0ef73`.
- Certificado SHA-256 `b5f360604095a50f3208299767dcedca2f3acfc5087df8be1fde9cc075c120c3`.
- Evidencia local de firma, actualización y compilación en `.local/android-046-libro-diario/`.

La actualización y sus comprobaciones usaron los metadatos del paquete habitual. La sesión personal y los movimientos reales quedaron fuera de la prueba.

## Recorrido en el Samsung

La WebView del Samsung ejecutó los recursos de la misma compilación desde el paquete temporal `com.kaptal.app.qa.libro046`. La prueba usó cuentas ficticias y el backend local con H2 en memoria. La compilación de QA reemplazó el dominio de la API por un dominio reservado. Las solicitudes se interceptaron y se reenviaron al backend local, con los destinos externos bloqueados. Se retiraron el paquete temporal y la conexión ADB de la prueba al cerrar.

- Captura guardó un único gasto ficticio de MX$127.35 en la cuenta elegida. Actividad mostró un único movimiento. Reportes mostró octubre vacío y noviembre con el gasto, y conservó noviembre al recargar.
- Libro diario presentó un único asiento de origen con MX$127.35 en Debe y Haber. Los filtros de fechas, evento, tipo y cuenta encontraron el asiento. El enlace de origen llevó al movimiento exacto.
- Gastos compartidos registró un aporte de MX$100 y un gasto de MX$10.01. El reparto por partes 2 a 1 dio MX$6.67 y MX$3.34, con un fondo de MX$89.99. Las cuentas personales ficticias conservaron sus valores.
- Pasó un recorrido automatizado en el dispositivo y se revisaron siete capturas físicas. El tamaño raíz CSS pasó de 17.6 a 35.2 px. Las siete vistas midieron 384 × 832 px y 384 px de ancho desplazable del documento. La tabla contable mantiene su desplazamiento horizontal interno. Hubo tres escrituras esperadas con respuesta 201, cero errores JavaScript y cero destinos externos observados. La evidencia quedó en `.local/android-046-libro-diario/evidencia/`.

El arnés requirió configurar la firma JWT ficticia de H2, seleccionar explícitamente la cuenta de Captura y medir el tamaño del texto a partir de la fuente base del Samsung. La ejecución final usó esos ajustes. La prueba de tamaño se aplicó por CSS en el paquete temporal.

## Hallazgos visuales

- El selector nativo de mes de Reportes recortó el año con el texto al doble. El texto auxiliar muestra el periodo completo y el filtro aprobó el cambio de mes y la recarga.
- La fecha larga del asiento apareció en inglés en el Samsung. Los campos de fecha del filtro conservaron el formato numérico completo.
- En Actividad, el texto de ayuda del buscador quedó truncado con el texto al doble. Las notificaciones de éxito se superpusieron temporalmente sobre parte del contenido de Actividad y Gastos compartidos.

La rama de entrega registra la APK local y su actualización. `develop` sigue en `5503c57` y `main` en `81acd45`, según las referencias Git verificadas. Calendario conservado. Historial, lentitud y logout siguen aplazados.
