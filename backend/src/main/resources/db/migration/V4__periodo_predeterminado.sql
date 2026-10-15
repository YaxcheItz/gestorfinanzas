ALTER TABLE usuarios ADD COLUMN periodo_tipo varchar(16) NOT NULL DEFAULT 'MES';
ALTER TABLE usuarios ADD COLUMN periodo_ancla date NOT NULL DEFAULT DATE '2026-01-05';
ALTER TABLE usuarios ADD COLUMN periodo_dia_inicio integer NOT NULL DEFAULT 1;
ALTER TABLE usuarios ADD COLUMN periodo_dia_quincena integer NOT NULL DEFAULT 16;
ALTER TABLE usuarios ADD CONSTRAINT ck_usuario_periodo CHECK (
  periodo_tipo IN ('MES','SEMANA','CATORCENA','QUINCENA','ANIO','TODO','HOY')
  AND periodo_ancla BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'
  AND periodo_dia_inicio BETWEEN 1 AND 31
  AND periodo_dia_quincena BETWEEN 1 AND 31
  AND (periodo_tipo <> 'QUINCENA' OR (periodo_dia_inicio <= 27 AND periodo_dia_quincena > periodo_dia_inicio))
);
