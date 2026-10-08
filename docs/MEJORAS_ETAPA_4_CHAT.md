# Etapa 4: chat persistente y confirmación recuperable

Fecha: 7 de octubre de 2026. Continuación autorizada después de revisar etapa 3.

## Comprobación previa de local y remoto

- Se recuperó el estado guardado y se ejecutó `git fetch origin --prune` antes de implementar.
- El árbol de trabajo estaba limpio. `develop` y `origin/develop` coincidían en `2f28f3ed105d0c496a69aae704d909962816a921`, sin commits exclusivos a ninguno de los lados.
- `main` y `origin/main` coincidían en `237142dfbd94e5d11f89dde03feb0e5a4a8ee152`. Main contiene seis commits adicionales de merge, pero sus archivos son idénticos a develop; no había cambios funcionales por traer.
- La API pública de GitHub confirmó dos ejecuciones CI exitosas para el commit actual de develop. `replica/mejoras-etapa4/ci-remoto.json` conserva los enlaces. Hubo un fallo en un commit anterior, no en la versión verificada. La consulta inicial con gh no tenía autenticación; se comprobó después por la API pública.
- La suite backend inicial volvió a pasar sus 281 pruebas. Las comprobaciones antiguas se conservaron como históricas, sin asumir que seguían vigentes.

## Correcciones

Las propuestas dejan de depender de un mapa en memoria. `propuestas_chat` guarda propietario, datos, resumen, vencimiento, estado y versión. Una instancia nueva puede recuperar propuestas del mismo usuario. Preparar o editar no registra movimientos. Los pendientes duran 24 horas y se admiten hasta 50 por usuario. Las listas de IA de hasta ocho propuestas se crean juntas; si falla una, no quedan propuestas parciales.

Confirmar bloquea primero el usuario y después la propuesta. La operación financiera y el estado completado pertenecen a la misma transacción. Si el commit falla, ambos se revierten. Después de un commit correcto, reintentar devuelve el mismo resultado; no vuelve a ejecutar la operación. También se protege la confirmación simultánea. Los resultados completados siguen siendo recuperables por ID incluso después del vencimiento de la propuesta pendiente.

La recuperación está limitada al propietario. Editar y descartar usan el mismo bloqueo. Una edición conserva el ID y el origen de voz, valida cuentas y categorías propias, aumenta la versión cuando cambia y requiere confirmación posterior. La API rechaza confirmar o editar con una versión anterior. La versión devuelta se obtiene tras flush, por lo que editar sin cambiar nada no inventa una versión. Descartar persiste, pero no borra un movimiento ya confirmado. El borrado de cuenta elimina sus propuestas.

El chat global recupera pendientes al entrar y permite hacerlo manualmente. Se puede editar tipo, monto, fecha, cuenta, destino, tasa, descripción y notas; los botones de categoría actualizan la misma propuesta, sin volver a interpretar el texto ni crear otra. Los campos monetarios respetan la privacidad del ojito. Limpiar la conversación no elimina registros financieros ni descarta propuestas persistidas: se pueden recuperar después.

Una respuesta incierta conserva la propuesta y permite reintentar el mismo ID y versión. El mensaje ya no asegura que «no se guardó» cuando se perdió la respuesta. Cambiar usuario cancela operaciones pendientes y limpia propuestas, editor, reportes y categorías; se ignoran respuestas tardías. Reintentar un reporte fallido conserva el orden válido de los mensajes.

Las reglas y los reportes locales siguen funcionando sin enviar contexto a IA. Las cifras de un reporte devuelto por un proveedor no se muestran como gráficos financieros verificados: el formato se valida y el gráfico se omite. Los gráficos locales usan agregados calculados por el servidor. El texto libre de IA sigue siendo interpretación, no una conciliación financiera ni una garantía de exactitud.

Las consultas externas del asistente tienen cuota por usuario de 10 por minuto, cuatro generaciones simultáneas por proceso, prompt máximo de 60.000 caracteres, respuesta máxima de 40.000 y máximo de 1.200 tokens de salida solicitados. Los clientes de IA y transcripción usan 10 segundos de conexión y 30 de lectura; se conserva el comportamiento de otros clientes HTTP. El permiso para transcribir audio sigue separado del permiso para compartir contexto financiero.

## Verificación

Resultados finales en `replica/mejoras-etapa4/verification.json`. Pruebas backend en `backend-final.log`, frontend en `frontend-final.log`, compilación en `frontend-build.log` y navegador en `browser-checks.json`.

Resultado final: 296 pruebas backend / 41 suites y 204 frontend / 24 archivos, sin fallos. Compilación Angular de producción exit 0; Chromium 4/4 escenarios, sin errores JavaScript ni desbordamiento horizontal. Diff sin errores de espacios, permitiendo CRLF. No hay script de lint independiente configurado; el compilador Angular comprueba tipos y plantillas.

El bundle inicial queda en 614.29 kB frente a presupuesto de 500 kB; creció desde 604.64 kB al añadir recuperación y editor. Persiste CSS del login +1 byte sobre 4 kB. La inspección visual detectó un editor comprimido por el resto del chat: mientras se edita se reserva el panel para el formulario, que tiene desplazamiento propio. La repetición final comprueba al menos 300 px de alto del editor en pantallas de 800 px o más.

Las regresiones prueban recuperación desde otra instancia, reintento tras commit, confirmación simultánea, acceso de otra cuenta, edición con versión anterior, edición idéntica, descarte, vencimiento, rollback del commit con restauración de saldo, limpieza al eliminar cuenta, lote parcial y flujo HTTP autenticado. Se comprueban cuotas y tamaños del proveedor sin enviar solicitudes externas.

El navegador usa el build de producción con API sintética en móvil claro/oscuro, escritorio y horizontal. Simula una respuesta perdida después de guardar, recupera propuestas tras recarga, edita sin registrar, reintenta sin duplicados, descarta, exige consentimiento y muestra un reporte local. El backend real se comprueba separadamente con H2 y MockMvc.

## Límites y continuidad

- Nueva tabla con SQL aditivo de referencia en `docs/sql/ETAPA_4_CHAT.sql`, no ejecutado en PostgreSQL. Se mantiene `ddl-auto:update`; migraciones versionadas, PostgreSQL y pruebas de actualización/rollback pertenecen a etapa 6.
- Las propuestas antiguas que vivían solo en memoria no se pueden reconstruir. Los respaldos financieros no incluyen propuestas pendientes. Los resultados completados y vencidos permanecen hasta borrar la cuenta; definir una política de retención sin romper reintentos en etapa 6.
- Cuota y concurrencia de IA son por proceso y se reinician con él. Un despliegue con varias instancias necesita un límite distribuido. No se verificaron proveedores reales, PostgreSQL, dispositivos físicos ni producción. No se midió cobertura porcentual.
- La transcripción conserva su límite de 5 MB. El límite de cuatro generaciones y la cuota de chat no se atribuyen a transcripción ni a verificación de conexión; esos límites específicos siguen en seguridad complementaria, etapa 8.
- Continúan los límites históricos de MSI y consentimiento de vínculos anteriores. El trabajo offline/PWA sigue en etapa 5.
- Los cambios nuevos quedan locales y sin commit, push ni despliegue. El CI remoto comprobado corresponde al punto de partida, no a estos cambios nuevos.

Punto de revisión: etapa 4 completa; continuar con etapa 5 después de la revisión del usuario.
