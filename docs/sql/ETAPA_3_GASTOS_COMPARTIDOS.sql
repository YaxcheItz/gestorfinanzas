-- Referencia aditiva para PostgreSQL; no ejecutada en producción.
-- Revisar y convertir en migración versionada en la etapa 6.
BEGIN;
ALTER TABLE parejas ADD COLUMN IF NOT EXISTS pendiente boolean NOT NULL DEFAULT false;
ALTER TABLE parejas ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
ALTER TABLE parejas ADD COLUMN IF NOT EXISTS fecha_aceptacion timestamp;
ALTER TABLE parejas ADD COLUMN IF NOT EXISTS propietario_historial_id bigint;
ALTER TABLE parejas ADD COLUMN IF NOT EXISTS nombre_remitente_invitacion varchar(100);
ALTER TABLE parejas ADD COLUMN IF NOT EXISTS correo_remitente_invitacion varchar(150);
ALTER TABLE parejas ADD COLUMN IF NOT EXISTS correo_destinatario_invitacion varchar(150);
ALTER TABLE pagos_pareja ADD COLUMN IF NOT EXISTS registrado_por_id bigint REFERENCES usuarios(id);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS referencia_historica boolean NOT NULL DEFAULT false;
COMMIT;
-- No inventar aceptación ni autoría histórica. Revisar consentimiento de vínculos anteriores.
-- Si Hibernate creó previamente registrado_por_id, verificar su FK: IF NOT EXISTS no la añade retroactivamente.
