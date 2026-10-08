-- Referencia aditiva. No ejecutada en PostgreSQL. Migraciones formales: etapa 6.
-- Nullable para conservar compatibilidad con solicitudes históricas.
ALTER TABLE transacciones ADD COLUMN IF NOT EXISTS client_request_fingerprint VARCHAR(64);
