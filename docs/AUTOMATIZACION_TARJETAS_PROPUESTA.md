# Propuesta: agregar tarjetas y formatos desde Kaptal

## Hallazgo y entrega inmediata

Los formatos nuevos no coincidian con los patrones locales: el aviso explicito Amex MX$ con terminacion de cinco digitos no estaba soportado; el resumen de gasto y total diario solo se reconocia para Amex y exigia centavos. Se corrigieron con fixtures ficticios. El propietario confirma MXN como predeterminado para avisos sin moneda en todas sus cuentas. Monedas extranjeras explicitas siguen siendo distintas. Esta correccion requiere entregar una APK actualizada antes de observar nuevos avisos reales; no se ha probado el telefono.

## Propuesta para revisar al final

1. En Agregar tarjeta o automatizacion, elegir la app de origen y una cuenta existente. MXN predeterminado; cambiar moneda seria una funcion posterior, sin alterar historial.
2. Elegir gasto, ingreso o transferencia con explicacion y consentimiento por origen. Santander continua solo gastos mientras siga vigente esa restriccion.
3. Seleccionar un perfil conocido o revisar un ejemplo autorizado dentro del dispositivo. No recuperar avisos descartados. Mostrar vista previa de tipo, monto individual, moneda, comercio y cuenta antes de activar. No confundir total diario, saldo y limite con importe de operacion.
4. Para formatos nuevos, ofrecer un editor guiado de campos y plantillas locales versionadas; evitar exigir regex/codigo al usuario. Probar plantilla con datos ficticios y comprobar avisos negativos, tarjeta, moneda y ambiguedad antes de permitir automatizacion. Requiere ampliar el registro de perfiles actual, que hoy usa paquetes oficiales fijos. No basta con quitar su filtro.
5. Ante un formato desconocido, identidad ambigua o moneda explicita incompatible, mantener revision. Mostrar motivo comprensible y una opcion para configurar futuras recepciones; no reclasificar ni reenviar el historial automaticamente.
6. Una transferencia requiere origen/destino y deduplicacion de avisos de ambos bancos; no tratarla como gasto mas ingreso independientes. Disenar este contrato antes de habilitarla.

## Android y rutinas

La via principal propuesta es el NotificationListenerService que Kaptal ya usa. Android proporciona callbacks con la notificacion y el paquete de origen; el acceso y sus limitaciones dependen del sistema y del permiso. Conservar filtrado previo del origen, consentimiento, sesion, datos minimos y deduplicacion. No garantiza recibir cualquier mensaje ni contenido que el sistema no entregue. Fuente oficial: https://developer.android.com/reference/android/service/notification/NotificationListenerService

Samsung ofrece condiciones y acciones en Modos y Rutinas, con disponibilidad variable por dispositivo/software. La documentacion revisada no acredita un mecanismo universal para pasar el cuerpo de cualquier notificacion a Kaptal en segundo plano. Queda como integracion opcional a verificar con la version concreta; no como requisito para Samsung ni para otros Android. Fuente oficial: https://www.samsung.com/us/support/answer/ANS10002538/

La automatizacion de transacciones de Atajos de Apple sirve como referencia de flujo, pero su documentacion de transacciones se refiere a Wallet; no demuestra una API equivalente universal para Android. Fuente oficial consultada en busqueda: https://support.apple.com/en-euro/guide/shortcuts/apd65c67538a/ios

## Orden y limites

Primero corregir formatos demostrados y comprobar CI/APK; despues observar avisos habituales con consentimiento. Revisar contigo la interfaz al final, dentro de la etapa de diseno. No activar canales, permisos o captura general de todas las apps; no usar IA real ni servicios pagados para probar. La prueba fisica y el registro real nuevo siguen pendientes mientras el propietario utiliza su telefono.
