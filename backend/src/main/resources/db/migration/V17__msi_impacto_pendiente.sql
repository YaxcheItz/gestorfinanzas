ALTER TABLE "${flyway:defaultSchema}".transacciones ADD COLUMN impacto_pendiente boolean NOT NULL DEFAULT false;
CREATE INDEX idx_transacciones_impacto_pendiente_fecha ON "${flyway:defaultSchema}".transacciones (impacto_pendiente, fecha, id);
