ALTER TABLE "${flyway:defaultSchema}".conexiones_whatsapp
    ADD COLUMN guardar_automaticamente boolean NOT NULL DEFAULT false,
    ADD COLUMN contexto text,
    ADD COLUMN contexto_vence timestamp with time zone,
    ADD COLUMN audio_texto text,
    ADD COLUMN audio_codigo varchar(8),
    ADD COLUMN audio_vence timestamp with time zone,
    ADD COLUMN audio_fecha date;

CREATE TABLE "${flyway:defaultSchema}".eventos_whatsapp (
    id varchar(64) PRIMARY KEY,
    conexion_id uuid NOT NULL REFERENCES "${flyway:defaultSchema}".conexiones_whatsapp(id) ON DELETE CASCADE,
    generacion bigint NOT NULL,
    contenido_hash varchar(64) NOT NULL,
    respuesta text NOT NULL,
    creado timestamp with time zone NOT NULL
);
CREATE INDEX idx_eventos_whatsapp_conexion ON "${flyway:defaultSchema}".eventos_whatsapp(conexion_id);
