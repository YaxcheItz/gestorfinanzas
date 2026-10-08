# Etapa 2: exactitud financiera

Fecha: 6 de octubre de 2026. Implementación y verificación locales; sin despliegue ni cambios en producción.

## Cambios

Las compras MSI nuevas conservan un identificador común entre la primera cuota, el plan y las cuotas posteriores. La cuota base se calcula en centavos, redondeando hacia abajo; la última consume el importe pendiente exacto. Una compra de $100.00 a tres cuotas registra $33.33, $33.33 y $33.34 y termina con retención cero. El servidor valida importes positivos, hasta dos decimales, el tamaño del campo monetario, entre 2 y 60 cuotas y que cada cuota base alcance un centavo. Rechaza combinar MSI con otra recurrencia.

Pausar conserva el crédito retenido. Cancelar desde Configuración / Recurrentes libera exclusivamente lo pendiente de ese plan y conserva los pagos registrados. Un plan completado no puede reanudarse. Las cuotas vinculadas no pueden editarse ni eliminarse individualmente: se evita modificar una parte de una compra sin recalcular su compromiso completo. No se añadió una función de modificación retroactiva del contrato MSI ni una devolución bancaria automática. Las operaciones ordinarias mantienen su edición; solicitar MSI o recurrencia durante una edición se rechaza explícitamente, en lugar de ignorar esos campos.

El crédito disponible que presenta Angular descuenta también las cuotas retenidas. Cambiar el límite de una tarjeta debe cubrir el saldo comprometido, incluyendo la retención. Se preservan las versiones optimistas existentes de cuenta y plantilla; los cambios de saldo, cuota y retención se realizan en la transacción del servicio.

Las recurrencias guardan una fecha ancla. Enero 30 pasa por febrero 28 y regresa a marzo 30; un ancla al final de mes conserva el final de mes. Los aniversarios de febrero 29 vuelven al día 29 en el siguiente año bisiesto. Si la primera fecha propuesta es la continuación natural del movimiento, se conserva la fecha del movimiento como ancla; una primera fecha personalizada define su propia ancla. El formulario anual ahora limita el día al último día válido de febrero, sin saltar a marzo.

`CalendarioFinanciero` concentra el día civil en `America/Mexico_City` y permite comprobarlo con un `Clock` fijo. Se usa en dashboard, presupuestos, saldos iniciales, vencimientos, recordatorios, contexto y reglas de IA y nombre del respaldo. El indicador de vencimiento de Recurrentes utiliza esa misma zona en el navegador. Las fechas introducidas por el usuario siguen siendo fechas civiles explícitas.

## Respaldos y esquema

Los respaldos nuevos son versión 2. Guardan la retención de cuenta, las cuotas totales y pagadas, el importe pendiente, el ancla y el vínculo MSI. La restauración acepta versiones 1 y 2 y comprueba consistencia de cuotas, vínculos, tipo de cuenta y cobertura del crédito retenido. Una prueba exporta un plan parcialmente pagado, lo restaura en otro usuario y registra su última cuota sin retención sobrante.

Se añaden columnas nullable: `plantillas_recurrentes.fecha_ancla`, `monto_pendiente`, `compra_msi_id` y `transacciones.compra_msi_id`. El proyecto continúa usando `ddl-auto:update`; se dejó un SQL aditivo para revisión en `docs/sql/ETAPA_2_EXACTITUD_FINANCIERA.sql`. No se ejecutó sobre PostgreSQL. La gestión formal de migraciones sigue en la etapa 6. Frontend y backend deben actualizarse juntos para mostrar y proteger correctamente las cuotas vinculadas.

## Límite de los datos históricos

El código anterior no guardaba el total original ni el vínculo compra/cuotas. Los respaldos anteriores tampoco exportaban las cuotas o la retención. Esos datos faltantes no pueden reconstruirse con seguridad desde una descripción. No se asignaron compras históricas mediante heurísticas ni se modificaron saldos reales.

Los planes existentes sin importe pendiente usan, como compatibilidad, cuota por número de cuotas restantes. Eso no recupera centavos del total original. Un ancla histórica desconocida se fija en el próximo vencimiento conocido al registrar una cuota. Los movimientos anteriores sin vínculo MSI tampoco reciben automáticamente la nueva protección de edición. La vista previa de respaldos antiguos avisa cuando falta retención de una tarjeta.

Por tanto, la corrección queda verificada para operaciones nuevas y respaldos completos. La conciliación de MSI históricos sigue pendiente de contrastar los importes originales con sus datos reales. Este límite debe revisarse antes de publicar y queda registrado en el plan de continuidad.

## Verificación

- Backend: 256 pruebas en 37 suites, sin fallos, errores ni omisiones. Incluye 16 regresiones nuevas de exactitud: cuotas, cancelación, varias compras, edición, centavos, pausa, permisos, vencimiento futuro, respaldo, anclas y reloj.
- Frontend: 190 pruebas en 24 archivos, sin fallos. Cuatro pruebas nuevas cubren crédito retenido, compatibilidad, día civil y formulario anual bisiesto.
- Compilación Angular de producción correcta. Se conservan las advertencias de bundle inicial de 604.63 kB frente a 500 kB y CSS de login un byte por encima de 4 kB.
- Chromium sobre el build real con API sintética: móvil claro, móvil oscuro, escritorio y horizontal; pendiente exacto, compra completada sin reanudación, confirmación antes de borrar y cancelación del diálogo sin petición DELETE. Sin overflow horizontal ni errores JavaScript. Service workers bloqueados y movimiento reducido activado; no equivale a prueba sobre teléfono físico o API real.
- Diff sin errores de espacios, permitiendo CRLF. Sin porcentaje de cobertura medido, nueva auditoría de dependencias ni prueba sobre PostgreSQL real.

Evidencias en `replica/mejoras-etapa2/`: logs finales, `browser-msi.mjs`, capturas, `browser-checks.json`, `verification.json` y procedencia de Caveman. Los reportes JUnit están en `backend/target/surefire-reports/`.

## Caveman

Se instaló la skill oficial de `https://github.com/JuliusBrussee/caveman` mediante `skill-installer`, fijando el commit `99aafe151a1be72be783e662858e8a0955add59f`. Destino: `C:/Users/yaxti_cm5rg3t/.codex/skills/caveman`. El archivo coincide byte por byte con el origen fijado; SHA-256 `34255a0215a7701eb83d508d03bc9560dc7bffbeb95a145ad2921ad2598a03bf`.

No se instalaron proxy, hooks, CLI ni dependencias adicionales. No se reescribió la configuración global. La skill apareció en el catálogo durante esta misma sesión; el usuario pidió usarla y se activó sin cerrar la sesión. Su estilo breve se aplica a las respuestas, manteniendo redacción normal en código y documentos.

Skills de implementación: security-review, ecc-verification-loop y ui-ux-pro-max. Se preservaron los cambios locales anteriores. No hubo commit ni despliegue. La siguiente etapa es gastos compartidos, después de revisar este resultado.

## Actualización posterior

La etapa 3 eleva los respaldos nuevos a versión 3 para conservar autoría de pagos compartidos. Sigue admitiendo versiones 1 y 2. Esta actualización no cambia los límites históricos de MSI documentados en este informe.
