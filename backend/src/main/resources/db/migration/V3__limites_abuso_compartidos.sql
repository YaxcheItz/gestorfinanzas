CREATE TABLE "${flyway:defaultSchema}".limites_abuso (
    clave varchar(240) PRIMARY KEY,
    hasta timestamp with time zone NOT NULL,
    consumidos integer NOT NULL CHECK (consumidos > 0)
);
CREATE INDEX idx_limites_abuso_hasta ON "${flyway:defaultSchema}".limites_abuso (hasta);
