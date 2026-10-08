-- Referencia aditiva para PostgreSQL. No ejecutada en producción.
-- Revisar con el proceso de migraciones de la etapa 6 antes de publicar.
BEGIN;
ALTER TABLE plantillas_recurrentes ADD COLUMN IF NOT EXISTS fecha_ancla date;
ALTER TABLE plantillas_recurrentes ADD COLUMN IF NOT EXISTS monto_pendiente numeric(15,2);
ALTER TABLE plantillas_recurrentes ADD COLUMN IF NOT EXISTS compra_msi_id uuid;
ALTER TABLE transacciones ADD COLUMN IF NOT EXISTS compra_msi_id uuid;
COMMIT;
-- No hacer backfill por descripción: el total y vínculo de MSI históricos pueden ser desconocidos.
