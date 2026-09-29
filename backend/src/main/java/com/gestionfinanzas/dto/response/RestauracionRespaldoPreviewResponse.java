package com.gestionfinanzas.dto.response;

import java.time.Instant;
import java.util.List;

public record RestauracionRespaldoPreviewResponse(
        int version,
        Instant generadoEn,
        int cuentas,
        int categorias,
        int presupuestos,
        int recurrencias,
        int transacciones,
        int eventosHistorial,
        int asientosContables,
        boolean destinoVacio,
        boolean puedeRestaurar,
        List<String> advertencias
) {}
