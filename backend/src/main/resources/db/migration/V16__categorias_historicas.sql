CREATE TABLE "${flyway:defaultSchema}".categorias_historicas (
 id bigint PRIMARY KEY,
 usuario_id bigint NOT NULL REFERENCES "${flyway:defaultSchema}".usuarios(id) ON DELETE CASCADE,
 nombre varchar(80) NOT NULL,
 tipo varchar(30) NOT NULL,
 icono varchar(50), color varchar(7)
);
ALTER TABLE "${flyway:defaultSchema}".transacciones ADD COLUMN categoria_historica_id bigint REFERENCES "${flyway:defaultSchema}".categorias_historicas(id);
ALTER TABLE "${flyway:defaultSchema}".presupuestos ADD COLUMN categoria_historica_id bigint REFERENCES "${flyway:defaultSchema}".categorias_historicas(id);
ALTER TABLE "${flyway:defaultSchema}".plantillas_recurrentes ADD COLUMN categoria_historica_id bigint REFERENCES "${flyway:defaultSchema}".categorias_historicas(id);
ALTER TABLE "${flyway:defaultSchema}".presupuestos ALTER COLUMN categoria_id DROP NOT NULL;
ALTER TABLE "${flyway:defaultSchema}".presupuestos DROP CONSTRAINT uk_presupuesto_usuario_cat_periodo_lista;
ALTER TABLE "${flyway:defaultSchema}".presupuestos ADD CONSTRAINT uk_presupuesto_usuario_cat_periodo_lista UNIQUE NULLS NOT DISTINCT (usuario_id,categoria_id,categoria_historica_id,mes,anio,lista_id);
ALTER TABLE "${flyway:defaultSchema}".transacciones ADD CONSTRAINT ck_categoria_unica CHECK (categoria_id IS NULL OR categoria_historica_id IS NULL);
ALTER TABLE "${flyway:defaultSchema}".presupuestos ADD CONSTRAINT ck_categoria_presupuesto CHECK ((categoria_id IS NULL) <> (categoria_historica_id IS NULL));
ALTER TABLE "${flyway:defaultSchema}".plantillas_recurrentes ADD CONSTRAINT ck_categoria_recurrencia CHECK (categoria_id IS NULL OR categoria_historica_id IS NULL);
