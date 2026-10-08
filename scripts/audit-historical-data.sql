-- Solo lectura. psql -X -v ON_ERROR_STOP=1 -v schema=finanzas -f scripts/audit-historical-data.sql
-- Salida 3 bloquea publicación cuando falta evidencia histórica. No inventa autoría ni importes.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SELECT id, usuario_id, cuenta_id, cuotas_totales, cuotas_pagadas,
       monto_pendiente, compra_msi_id, fecha_ancla
FROM :"schema".plantillas_recurrentes
WHERE cuotas_totales IS NOT NULL
  AND (monto_pendiente IS NULL OR compra_msi_id IS NULL OR fecha_ancla IS NULL
       OR cuotas_pagadas IS NULL OR cuotas_pagadas < 0 OR cuotas_pagadas > cuotas_totales
       OR monto_pendiente < 0)
ORDER BY id;

SELECT c.id, c.usuario_id, c.limite_retenido,
       COALESCE(sum(p.monto_pendiente), 0) AS pendiente_conocido
FROM :"schema".cuentas c
LEFT JOIN :"schema".plantillas_recurrentes p ON p.cuenta_id = c.id AND p.cuotas_totales IS NOT NULL
WHERE c.tipo = 'CREDITO'
GROUP BY c.id, c.usuario_id, c.limite_retenido
HAVING c.limite_retenido IS NULL OR c.limite_retenido <> COALESCE(sum(p.monto_pendiente), 0)
ORDER BY c.id;

SELECT id, usuario_a_id, usuario_b_id
FROM :"schema".parejas
WHERE activa AND NOT pendiente AND propietario_historial_id IS NULL AND fecha_aceptacion IS NULL
ORDER BY id;

-- La ausencia de autor en pagos antiguos se conserva; siguen de solo lectura.
SELECT count(*) AS pagos_sin_autor_conocido FROM :"schema".pagos_pareja WHERE registrado_por_id IS NULL;

SELECT (
    EXISTS (SELECT 1 FROM :"schema".plantillas_recurrentes WHERE cuotas_totales IS NOT NULL
        AND (monto_pendiente IS NULL OR compra_msi_id IS NULL OR fecha_ancla IS NULL
             OR cuotas_pagadas IS NULL OR cuotas_pagadas < 0 OR cuotas_pagadas > cuotas_totales OR monto_pendiente < 0))
    OR EXISTS (SELECT 1 FROM :"schema".cuentas c WHERE c.tipo='CREDITO'
        AND (c.limite_retenido IS NULL OR c.limite_retenido <> COALESCE(
            (SELECT sum(p.monto_pendiente) FROM :"schema".plantillas_recurrentes p WHERE p.cuenta_id=c.id AND p.cuotas_totales IS NOT NULL),0)))
    OR EXISTS (SELECT 1 FROM :"schema".parejas WHERE activa AND NOT pendiente
        AND propietario_historial_id IS NULL AND fecha_aceptacion IS NULL)
) AS publicacion_bloqueada
\gset
ROLLBACK;
\if :publicacion_bloqueada
  \echo 'PUBLICACION BLOQUEADA: conciliar MSI/retención y renovar consentimiento con evidencia verificable.'
  DO $$ BEGIN RAISE EXCEPTION 'PUBLICACION BLOQUEADA: faltan evidencias históricas'; END $$;
\else
  \echo 'Sin bloqueos detectados por estas consultas. No sustituye conciliación contable ni autorización de publicación.'
\endif
