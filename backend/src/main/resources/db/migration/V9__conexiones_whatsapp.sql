CREATE TABLE "${flyway:defaultSchema}".conexiones_whatsapp (
    id uuid PRIMARY KEY,
    usuario_id bigint NOT NULL UNIQUE REFERENCES "${flyway:defaultSchema}".usuarios(id) ON DELETE CASCADE,
    estado varchar(16) NOT NULL,
    telefono varchar(16),
    telefono_activo_hash varchar(64) UNIQUE,
    desafio_hash varchar(64) UNIQUE,
    emitida timestamp with time zone NOT NULL,
    vence timestamp with time zone,
    verificada timestamp with time zone,
    revocada timestamp with time zone,
    generacion bigint NOT NULL,
    CONSTRAINT ck_conexion_whatsapp_estado CHECK (estado IN ('PENDIENTE','VERIFICADA','DESCONECTADA')),
    CONSTRAINT ck_conexion_whatsapp_verificada CHECK (
        (estado = 'VERIFICADA' AND telefono_activo_hash IS NOT NULL AND verificada IS NOT NULL)
        OR (estado <> 'VERIFICADA' AND telefono_activo_hash IS NULL)
    )
);
