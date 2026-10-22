ALTER TABLE "${flyway:defaultSchema}".transacciones
    ADD COLUMN fuente_cambio varchar(30),
    ADD COLUMN fecha_cambio date;
