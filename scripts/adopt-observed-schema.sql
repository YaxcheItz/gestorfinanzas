-- Ajuste observado en la copia real. NO hace baseline ni concilia datos.
-- Ejecutar únicamente tras respaldo verificado y comparación del resto del esquema.
-- psql -X -v ON_ERROR_STOP=1 -v schema=finanzas -f scripts/adopt-observed-schema.sql
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SELECT set_config('search_path', format('%I,pg_catalog', :'schema'), true);
DO $$
DECLARE check_name text;
BEGIN
    -- No sustituir una restricción desconocida ni relajar controles adicionales.
    SELECT conname INTO STRICT check_name
    FROM pg_constraint
    WHERE conrelid = 'categorias'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid, true) =
          'CHECK (tipo::text = ANY (ARRAY[''INGRESO''::character varying::text, ''GASTO''::character varying::text, ''TRANSFERENCIA''::character varying::text]))';
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = 'cuentas'
                 AND column_name = 'moneda' AND column_default IS NOT NULL) THEN
        RAISE EXCEPTION 'Default de moneda inesperado; adopcion bloqueada';
    END IF;
    EXECUTE format('ALTER TABLE categorias DROP CONSTRAINT %I', check_name);
    ALTER TABLE categorias ADD CONSTRAINT categorias_tipo_check
        CHECK (tipo IN ('INGRESO', 'GASTO', 'TRANSFERENCIA', 'SALDO_INICIAL'));
    ALTER TABLE cuentas ALTER COLUMN moneda SET DEFAULT 'MXN';
END $$;
COMMIT;
