-- Referencia aditiva para PostgreSQL. No ejecutada en producción.
-- Convertir en migración versionada y verificar rollback en etapa 6.
BEGIN;
CREATE TABLE IF NOT EXISTS propuestas_chat (
    id varchar(36) PRIMARY KEY,
    usuario_id bigint NOT NULL REFERENCES usuarios(id),
    tipo varchar(40) NOT NULL,
    resumen varchar(500) NOT NULL,
    datos text NOT NULL,
    vence timestamp with time zone NOT NULL,
    completada boolean NOT NULL DEFAULT false,
    descartada boolean NOT NULL DEFAULT false,
    version bigint NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_propuesta_usuario ON propuestas_chat(usuario_id);
COMMIT;
-- No migrar propuestas que existían solo en memoria: no hay una fuente persistente que recuperar.
-- No borrar resultados completados durante reintentos. Definir retención explícita en etapa 6.
