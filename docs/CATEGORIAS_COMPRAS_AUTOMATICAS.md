# Categorías para compras automáticas de Android

Las compras nuevas reconocidas por el registro automático pueden guardarse con categoría sin pedir confirmación por gasto. La decisión usa únicamente la descripción del comercio ya parseada, con reglas locales del backend; no envía el aviso a un proveedor de IA ni consulta precios o datos externos.

## Comportamiento

| Palabras reconocidas en el comercio | Categoría o equivalente activo |
| --- | --- |
| Restaurante, taquería, cafetería, pizza | Comida / Restaurantes |
| Supermercado, abarrotes, despensa | Supermercado / Alimentos y Supermercado |
| Taxi, gasolina, estacionamiento | Transporte |
| Farmacia, clínica, hospital | Salud / Salud y Bienestar |
| Renta, electricidad, internet | Hogar / Vivienda y Servicios |
| Cine, teatro | Ocio / Ocio y Salidas |
| Sin coincidencia clara o varias actividades | Otros gastos |

Se buscan palabras completas, ignorando mayúsculas, acentos y separadores. No se adivina el giro de un comercio con nombre opaco; un intermediario como MercadoPago/PayPal tampoco identifica la actividad del comercio final. Los ejemplos de pruebas son ficticios.

Una categoría fija de la regla bancaria prevalece sobre la detección. Entre equivalentes activos se prefiere una categoría personal única frente a una global. No se elige la primera fila cuando hay varias categorías personales/globales equivalentes: se usa la alternativa Otros gastos. Si falta una categoría compatible, se crea solo la categoría necesaria para ese usuario, sin renombrar ni borrar las existentes. La creación manual comprueba duplicados bajo el mismo bloqueo de usuario usado por la recepción bancaria.

No se utilizan categorías de ingresos, archivadas o de otro usuario. Una categoría personal archivada no se reactiva ni se recrea con otro nombre equivalente. Si la categoría prevista está archivada o es ambigua, se intenta Otros gastos; si también está archivada o resulta ambigua, el gasto se conserva sin categoría, respetando esa configuración en lugar de impedir su registro.

## Reintentos e historial

La huella de recepción identifica los datos originales del aviso. Primero se busca una recepción anterior; solo una recepción nueva obtiene categoría, que se guarda en sus datos efectivos. Por eso un reintento no depende de nombres/categorías actuales y conserva la operación original.

Esto conserva también recibos de versiones anteriores: no se reclasifican ni vuelven a cargarse por recibir el mismo evento. Una corrección manual del movimiento no se sobrescribe. Un evento con identificador repetido y otros datos sigue rechazándose. Se mantienen comprobaciones de cuenta/lista/propietario, coincidencias y deduplicación existentes. Ingresos/devoluciones quedan fuera de la clasificación; Santander continúa limitado a compras/gastos.

La entrada manual y otros canales mantienen su comportamiento. No se han añadido endpoints, campos a la API, migraciones, dependencias ni un aprendizaje automático de correcciones anteriores. La revisión funcional de categorías y el diseño por secciones/etiquetas siguen en el plan.

## Validación y entrega

- TDD: cinco fallos iniciales reprodujeron compras sin categoría; otra prueba reprodujo el chequeo de duplicados manual previo a obtener el bloqueo. Después de la corrección,43pruebas focales correctas:19del clasificador,11de recepción/categorización,4del servicio de categorías y9del flujo bancario existente.
- Cobertura JaCoCo del clasificador:100%líneas y100%ramas. JaCoCo se ejecutó como herramienta puntual, sin añadir dependencia a la aplicación.
- Suite backend local:560casos sin fallos/errores, ocho PostgreSQL omitidos en H2 y reservados para CI. Entorno de pruebas fijado a H2, sin claves de proveedores ni acceso a datos productivos.
- E2E con backend local real y usuario/dinero ficticios: compra de restaurante y comercio desconocido, repetición del mismo evento, dos gastos únicos y categorías visibles en Movimientos. El primer conteo del fixture incluía Saldo inicial; se corrigió para comprobar solo gastos, sin cambiar la lógica financiera.
- Esta mejora del backend no requiere otra APK. El ajuste visual anterior de0.1.15/código16, SHA256 `85A337B3C968C28DA30F2ACCC0426FAD5755E1FE53B2E21810BC61BCDD7980C0`, ya se instaló en el Samsung conservando firma/datos y primera instalación2026-10-22.

Fuente/CI/integración/publicación y evidencia real posterior se registran por separado en estado/plan y continuación local. No se harán compras ni QA en producción para probar categorías; la primera observación productiva será con un aviso habitual futuro. Los movimientos anteriores mantienen su categoría. Gmail deshabilitado y TalkBack omitido.
