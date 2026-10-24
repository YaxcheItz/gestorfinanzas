# Reinicio autorizado de los datos de prueba

El propietario pidió eliminar todos los usuarios de prueba, conservar únicamente su usuario vinculado con Google, vaciar sus datos financieros y crear cinco cuentas nuevas. La operación se realizó sobre los datos de Kaptal el 23 de octubre de 2026; no cambia el código servido ni despliega develop a producción.

## Resultado verificado

- Usuarios: de nueve a uno; eliminados los otros ocho. La identidad, vinculación Google, contraseña, rol y versión de tokens de la cuenta conservada no cambiaron. Se preservaron sus sesiones; se eliminaron las de los demás usuarios.
- Cuentas anteriores: 28 eliminadas. Creadas Santander, American Express, BBVA y Sears Visa como crédito, y Revolut como débito. Las cinco en MXN, activas y con saldo cero.
- Movimientos anteriores: 48 eliminados; quedan cero movimientos, cero asientos contables y cero auditorías financieras anteriores.
- Eliminados también avisos, propuestas de chat, presupuestos, recurrencias, categorías personales, listas compartidas y sus relaciones, conexiones/eventos de WhatsApp y configuraciones de canal de prueba. Se recreó únicamente la lista Personal vacía con su propietario.
- No se inventaron límites de crédito, fechas de corte/pago ni condiciones de cashback; permanecen sin configurar. Pueden completarse después y no son necesarios para asociar una compra a una cuenta.

## Protección y comprobaciones

Antes del cambio se inventariaron tablas y claves foráneas, se identificó de forma única al usuario activo vinculado con Google y se exportó el esquema de aplicación mediante pg_dump. La copia quedó cifrada con Windows DPAPI para el perfil local; se comprobaron descifrado, hashes y lectura del catálogo de archivo con pg_restore. No se ejecutó una restauración completa. La copia contiene información privada y no debe subirse al repositorio; restaurarla requiere este perfil Windows y un procedimiento de recuperación revisado.

La limpieza y creación se ejecutaron en una transacción con bloqueos, límites de espera y aserciones antes del COMMIT. Se verificaron huellas de autenticación y de las sesiones conservadas, inventario previo, estado final de las tablas y los cinco tipos/saldos. No se reiniciaron secuencias: las cuentas nuevas tienen identificadores posteriores a los anteriores, para evitar que un borrador viejo termine apuntando a otra cuenta. No se cambiaron migraciones ni se tocaron otras bases de datos.

Evidencia y copia cifrada privadas en `.local/reset-20261022/`; script de mantenimiento `.local/kaptal-reset.py`, sin seguimiento Git. No repetir `apply`: la herramienta conserva una marca de operación ya realizada. La fixture Android anterior pertenece a un usuario eliminado y no se debe reutilizar para login, gastos o creación automática de nuevos usuarios en producción. Las pruebas posteriores deben usar un entorno aislado.

El reinicio del servidor no demuestra que un cliente abierto haya vaciado su caché o sus borradores locales. Se detuvieron las dos instalaciones Android antes de la transacción y se reabrió release después. Los identificadores anteriores ya no son válidos y no se reutilizan; no sincronizar borradores de prueba pendientes sin descartarlos.

## Cambio solicitado para Etapa 10

El propietario sustituyó la revisión obligatoria de cada compra por registro automático de movimientos reconocidos, especialmente gastos, para Santander, Revolut, American Express y BBVA; añadió Sears Visa mediante SMS y proporcionó un formato de compra. El ejemplo real, remitente y terminación permanecen fuera del repositorio. El automático todavía no está implementado en la APK 0.1.4: esta conserva el flujo manual anterior.

La siguiente entrega debe asociar reglas a las cuentas recién creadas, procesar sin confirmación por cada gasto reconocido, evitar duplicados y mantener los casos ambiguos sin registrar importes a ciegas. El usuario también pidió widgets, accesos y gestos útiles, continuar Etapas 12/13 y dejar las modificaciones de diseño para el final. Gmail permanece deshabilitado; no se autorizó implícitamente un despliegue de código a main por realizar esta limpieza de datos.
