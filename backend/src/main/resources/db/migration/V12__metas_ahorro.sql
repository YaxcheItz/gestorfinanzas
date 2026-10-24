ALTER TABLE "${flyway:defaultSchema}".cuentas
    ADD COLUMN meta_objetivo numeric(15,2),
    ADD COLUMN meta_cancelada boolean NOT NULL DEFAULT false,
    ADD CONSTRAINT ck_meta_objetivo CHECK (meta_objetivo IS NULL OR (meta_objetivo > 0 AND tipo = 'AHORRO'));
