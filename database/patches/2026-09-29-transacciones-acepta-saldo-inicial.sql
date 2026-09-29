-- 2026-09-29 — transacciones.tipo acepta SALDO_INICIAL
--
-- El enum Java TipoTransaccion declara cuatro valores: INGRESO, GASTO,
-- TRANSFERENCIA y SALDO_INICIAL. Al crear una cuenta con saldo inicial,
-- CuentaService guarda una transaccion de tipo SALDO_INICIAL, y el CHECK que
-- vivia en Supabase solo permitia los tres primeros. El INSERT moria con:
--
--   ERROR: new row for relation "transacciones" violates check constraint
--          "transacciones_tipo_check"
--
-- La app devolvia 500 y el usuario veia un error generico, sin relacion con
-- el saldo inicial.
--
-- El CHECK se creo a mano en Supabase y no esta versionado en el repo, asi que
-- el esquema quedo a medias: asientos_contables.tipo_movimiento y
-- plantillas_recurrentes.tipo ya incluian SALDO_INICIAL, transacciones.tipo no.
-- categorias.tipo sigue sin aceptarlo a proposito, porque una categoria de
-- tipo SALDO_INICIAL no tiene sentido; CategoriaService.validarTipoEditable
-- lo rechaza antes de tocar la base.
--
-- Aplicar con la sesion de escritura (no una marcada como solo lectura).

alter table finanzas.transacciones
    drop constraint if exists transacciones_tipo_check;

alter table finanzas.transacciones
    add constraint transacciones_tipo_check
    check (tipo in ('INGRESO', 'GASTO', 'TRANSFERENCIA', 'SALDO_INICIAL'));

-- Verificacion: debe devolver una fila.
--   select tipo from finanzas.transacciones where tipo = 'SALDO_INICIAL' limit 1;
