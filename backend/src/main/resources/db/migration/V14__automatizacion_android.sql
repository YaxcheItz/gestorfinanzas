CREATE TABLE "${flyway:defaultSchema}".conexiones_android (
    id varchar(36) PRIMARY KEY,
    usuario_id bigint NOT NULL REFERENCES "${flyway:defaultSchema}".usuarios(id) ON DELETE CASCADE,
    dispositivo_id varchar(36) NOT NULL,
    token_hash varchar(64) NOT NULL,
    token_version integer NOT NULL,
    reglas text NOT NULL,
    vence timestamp with time zone NOT NULL,
    CONSTRAINT uk_android_dispositivo UNIQUE(usuario_id,dispositivo_id),
    CONSTRAINT uk_android_token UNIQUE(token_hash)
);
