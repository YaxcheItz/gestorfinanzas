# Cambios manuales de esquema

`ddl-auto: update` crea tablas y columnas, pero **no** crea ni modifica
`CHECK` constraints. Tampoco los que se agregaron a mano en Supabase.

Los tests corren contra H2, que no reproduce esos CHECK, asi que una
restriccion desalineada con un enum Java no se detecta hasta produccion y
solo en el camino de codigo que la ejerce.

Por eso los cambios que no salen de Hibernate van aqui, en un archivo por
cambio, en el orden en que se aplican.

## Como se aplican

Con una sesion de **escritura**. No abras la conexion en modo solo lectura y
no reutilices una conexion del pooler con `transaction_read_only` activo:
Supabase reutiliza la sesion y el siguiente INSERT falla con
`cannot execute INSERT in a read-only transaction`.

## Como se verifican

Despues de aplicar, confirma que el cambioSirva de verdad y no solo que la
sentencia paso. Para el patch `2026-09-29-transacciones-acepta-saldo-inicial`
la comprobacion es crear una cuenta con saldo inicial distinto de cero: si
aparece una transaccion `SALDO_INICIAL` en la tabla, el CHECK ya la acepta.

## Pendiente

`planning/deploy-production.md` pide volcar el esquema actual como migracion
inicial y pasar a Flyway. Ese paso es el que elimina la necesidad de esta
carpeta: mientras el esquema viva solo en Supabase, este es el unico
registro de por que una restriccion es como es.
