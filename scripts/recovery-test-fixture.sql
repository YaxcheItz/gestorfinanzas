-- Datos SINTÉTICOS para comprobar que pg_dump preserva centavos, MSI y propuestas completadas.
-- Solo admite nombres de bases de prueba; comprobar también host/aislamiento. Nunca usar en producción.
\set ON_ERROR_STOP on
SELECT current_database() ~ '^kaptal_[a-z0-9_]+_(test|e2e)$' AS base_de_pruebas
\gset
\if :base_de_pruebas
\else
  \echo 'Fixture rechazado: el nombre no corresponde a una base de pruebas dedicada.'
  DO $$ BEGIN RAISE EXCEPTION 'Fixture rechazado: base no dedicada a pruebas'; END $$;
\endif
BEGIN;
INSERT INTO finanzas.usuarios(nombre,email,password_hash,rol,activo)
VALUES ('Recuperacion prueba','recovery-fixture@example.test','hash-sintetico-sin-acceso','ROLE_USER',false)
RETURNING id AS usuario_id \gset
INSERT INTO finanzas.cuentas(usuario_id,nombre,tipo,activo,saldo_actual,limite_retenido,limite_credito,dia_corte,dia_pago)
VALUES (:usuario_id,'Tarjeta prueba','CREDITO',true,-33.33,66.67,1000,30,10)
RETURNING id AS cuenta_id \gset
INSERT INTO finanzas.plantillas_recurrentes(usuario_id,cuenta_id,tipo,monto,frecuencia,siguiente_fecha,activa,
    cuotas_totales,cuotas_pagadas,fecha_ancla,monto_pendiente,compra_msi_id)
VALUES (:usuario_id,:cuenta_id,'GASTO',33.33,'MENSUAL','2025-02-28',true,3,1,'2025-01-30',66.67,'11111111-1111-4111-8111-111111111111');
INSERT INTO finanzas.transacciones(usuario_id,cuenta_id,tipo,monto,fecha,descripcion,compra_msi_id,client_request_id)
VALUES (:usuario_id,:cuenta_id,'GASTO',33.33,'2025-01-30','Cuota sintética de recuperación',
    '11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
INSERT INTO finanzas.propuestas_chat(id,usuario_id,tipo,resumen,datos,vence,completada,descartada,version)
VALUES ('22222222-2222-4222-8222-222222222222',:usuario_id,'CREAR_TRANSACCION','Resultado sintético conservado',
    json_build_object('cuentaId',:cuenta_id,'tipo','GASTO','monto',33.33,'fecha','2025-01-30','descripcion','Cuota sintética de recuperación')::text,
    '2025-02-01T00:00:00Z',true,false,1);
COMMIT;
