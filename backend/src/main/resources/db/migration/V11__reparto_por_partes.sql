ALTER TABLE "${flyway:defaultSchema}".repartos_gasto ADD COLUMN partes INTEGER;
ALTER TABLE "${flyway:defaultSchema}".repartos_gasto DROP CONSTRAINT repartos_gasto_tipo_check;
ALTER TABLE "${flyway:defaultSchema}".repartos_gasto ADD CONSTRAINT repartos_gasto_tipo_check
    CHECK (tipo IN ('IGUAL', 'PORCENTAJE', 'EXACTO', 'PARTES'));
ALTER TABLE "${flyway:defaultSchema}".repartos_gasto ADD CONSTRAINT ck_reparto_partes
    CHECK (partes IS NULL OR partes BETWEEN 1 AND 1000000);
