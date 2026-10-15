# Listas, etiquetas y búsqueda

Etapa 2 del plan MonAi, rama `mejoras/listas-etiquetas`, creada desde `develop == origin/develop` en `dce49cdf57dc3a2263357a3e1eac27013ff00cc4`.

## Modelo y navegación

La píldora superior abre Tus listas. Desde allí puedes crear, seleccionar, renombrar, archivar y compartir una lista; Herramientas conserva el acceso a cuentas, presupuestos, informes y organización. No se agrega barra inferior ni más botones al Inicio.

Cada usuario tiene una lista Personal privada. V5 asigna a esa lista sus movimientos y recurrencias existentes, sin cambiar importes, monedas, saldos ni autoría. Personal no se comparte ni archiva. Las otras listas se comparten sólo mediante una invitación explícita, revocable, con vencimiento de siete días. El servidor guarda el hash del código. No se envían mensajes a terceros.

Roles: propietario administra la lista y participantes; editor añade y modifica sus propios movimientos usando sus propias cuentas; lector consulta. Ningún miembro puede cambiar cuentas o movimientos ajenos. Archivar conserva historial y bloquea cambios en movimientos. Al retirar un miembro se conserva su historial y se revoca su acceso a la lista. Si se elimina la cuenta del propietario, los movimientos de otros participantes se conservan y se transfiere la propiedad al primer miembro restante.

La moneda de lista es una preferencia de presentación. Cambiarla no convierte registros. Los resúmenes separan monedas; los saldos de cuentas y presupuestos mensuales siguen siendo propios y de todas las listas, con texto explícito en Inicio. No se simula un saldo bancario compartido.

## Registro y consulta

Registro rápido y formulario avanzado permiten seleccionar lista y añadir hasta ocho etiquetas. Se normalizan Unicode, minúsculas y duplicados; cada etiqueta admite hasta 32 letras, números, guion o guion bajo. La captura natural extrae hashtags antes de interpretar importes, conserva lista y etiquetas en la propuesta pendiente y mantiene ese contexto al editar o confirmar. El borrador offline conserva el destino inicial; cambiar de lista no reescribe una operación ya pendiente.

Inicio, informes, recientes, historial y exportación usan el contexto de lista. Historial permite combinar texto, importe, categoría, fechas, etiquetas y autor. Varias etiquetas se intersectan. La búsqueda conserva los resultados mientras llegan los nuevos; las consultas se cancelan al cambiar filtros/lista. Los índices cubren lista/fecha, lista/autor, lista/importe y etiquetas. No se usa IA para buscar.

## Compatibilidad de datos

El respaldo JSON pasa a versión 4; admite versiones anteriores. Incluye metadatos de listas, etiquetas y referencias de recurrencias. Las listas se restauran como copias privadas, sin miembros ni códigos de invitación, y sólo en una cuenta sin datos financieros ni listas adicionales. Incluye el contexto de movimientos propios aun después de salir de una lista compartida. No exporta movimientos ajenos como si fueran propios.

CSV agrega Lista, Etiquetas y Autor. El importador admite Lista y Etiquetas opcionales y los encabezados históricos Cuenta/Moneda/Monto o Cuenta origen/Moneda origen/Monto origen. Rechaza listas desconocidas, ambiguas o sin permiso; sin columna Lista conserva el destino seleccionado al leer el archivo. Sólo se importan gastos e ingresos, no transferencias ni saldos iniciales. CSV no sustituye el respaldo JSON para restauración completa.

## Verificación y pendientes

Verificación completada: build sin avisos y 311 pruebas frontend; suite PostgreSQL de 357 casos y rondas afectadas de 115 y 32 casos; 17 E2E; 66 comprobaciones visuales de dist y 33 sobre 4300. Son suites solapadas, no se suman. Recuperación real con pg_dump/pg_restore en bases nuevas: datos y esquema coinciden. El entorno local fue respaldado y migrado a V5, conservando huellas de cuentas, movimientos y recurrencias. Evidencia en `replica/listas-etiquetas/verification.json`.

No se incluyen búsquedas guardadas, reparto de deudas por lista, conversiones automáticas, widgets nativos, conectores bancarios ni informes conversacionales limitados a una lista. El asistente general mantiene su alcance previo sobre los datos propios; los informes del periodo sí respetan la lista seleccionada. Esas funciones requieren sus etapas correspondientes. La validación física Android sigue pendiente.
