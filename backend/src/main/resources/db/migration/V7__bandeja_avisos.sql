CREATE TABLE "${flyway:defaultSchema}".avisos_financieros (
    id varchar(36) PRIMARY KEY,
    usuario_id bigint NOT NULL REFERENCES "${flyway:defaultSchema}".usuarios(id) ON DELETE CASCADE,
    origen varchar(20) NOT NULL,
    identificador_hash varchar(64) NOT NULL,
    recepcion_hash varchar(64) NOT NULL,
    clave_registro uuid NOT NULL UNIQUE,
    resumen varchar(200) NOT NULL,
    clase varchar(25) NOT NULL,
    estado varchar(15) NOT NULL,
    moneda varchar(3) NOT NULL,
    datos text,
    transaccion_id bigint REFERENCES "${flyway:defaultSchema}".transacciones(id) ON DELETE SET NULL,
    creado_en timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version bigint NOT NULL DEFAULT 0,
    CONSTRAINT uk_aviso_origen UNIQUE(usuario_id, origen, identificador_hash),
    CONSTRAINT ck_aviso_estado CHECK (estado IN ('PENDIENTE','REGISTRADO','DESCARTADO')),
    CONSTRAINT ck_aviso_origen CHECK (origen IN ('MANUAL','GMAIL','WHATSAPP','SMS','NOTIFICACION')),
    CONSTRAINT ck_aviso_clase CHECK (clase IN ('COMPRA','INGRESO','DEVOLUCION','TRANSFERENCIA','PAGO_TARJETA','AUTORIZACION','SIN_CLASIFICAR'))
);
CREATE INDEX idx_aviso_usuario_estado_fecha ON "${flyway:defaultSchema}".avisos_financieros(usuario_id, estado, creado_en DESC);
