-- Adiciones de etapas 4-5. Flyway ejecuta esta migración en una transacción.
create table "${flyway:defaultSchema}".propuestas_chat (completada boolean not null, descartada boolean not null, usuario_id bigint not null, vence timestamp(6) with time zone not null, version bigint not null, id varchar(36) not null, tipo varchar(40) not null, resumen varchar(500) not null, datos text not null, primary key (id));
create index idx_propuesta_usuario on "${flyway:defaultSchema}".propuestas_chat (usuario_id);
alter table if exists "${flyway:defaultSchema}".propuestas_chat add constraint FKmqa9uydapt7a7gm88l79f67xt foreign key (usuario_id) references "${flyway:defaultSchema}".usuarios;
ALTER TABLE "${flyway:defaultSchema}".transacciones ADD COLUMN client_request_fingerprint varchar(64);
ALTER TABLE "${flyway:defaultSchema}".transacciones ALTER COLUMN cuenta_id DROP NOT NULL;
