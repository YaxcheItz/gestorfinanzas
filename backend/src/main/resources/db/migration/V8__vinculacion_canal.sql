CREATE TABLE "${flyway:defaultSchema}".vinculaciones_canal (
    hash varchar(64) PRIMARY KEY,
    usuario_id bigint NOT NULL REFERENCES "${flyway:defaultSchema}".usuarios(id) ON DELETE CASCADE,
    challenge varchar(43) NOT NULL,
    token_version integer NOT NULL,
    vence timestamp with time zone NOT NULL
);
CREATE INDEX idx_vinculacion_vence ON "${flyway:defaultSchema}".vinculaciones_canal(vence);
