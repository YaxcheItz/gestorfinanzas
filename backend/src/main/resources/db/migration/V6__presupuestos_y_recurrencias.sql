ALTER TABLE presupuestos ADD COLUMN lista_id bigint REFERENCES listas_financieras(id) ON DELETE SET NULL;
ALTER TABLE presupuestos ADD COLUMN porcentaje_alerta integer NOT NULL DEFAULT 80 CONSTRAINT ck_presupuesto_porcentaje_alerta CHECK (porcentaje_alerta >= 1 AND porcentaje_alerta <= 100);
UPDATE presupuestos p SET lista_id=(SELECT id FROM listas_financieras l WHERE l.propietario_id=p.usuario_id AND l.clave='PERSONAL');
ALTER TABLE presupuestos DROP CONSTRAINT uk_presupuesto_usuario_cat_periodo;
ALTER TABLE presupuestos ADD CONSTRAINT uk_presupuesto_usuario_cat_periodo_lista UNIQUE NULLS NOT DISTINCT (usuario_id, categoria_id, mes, anio, lista_id);
CREATE INDEX idx_presupuesto_usuario_lista_periodo ON presupuestos(usuario_id, lista_id, anio, mes);

ALTER TABLE transacciones ADD COLUMN plantilla_id bigint REFERENCES plantillas_recurrentes(id) ON DELETE SET NULL;
CREATE INDEX idx_transaccion_plantilla ON transacciones(plantilla_id);

ALTER TABLE plantillas_recurrentes ADD COLUMN fecha_fin date;
