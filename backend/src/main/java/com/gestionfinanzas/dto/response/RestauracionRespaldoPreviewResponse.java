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
        int parejas,
        int aportesPareja,
        int gastosPareja,
        int pagosPareja,
        boolean destinoVacio,
        boolean puedeRestaurar,
        List<String> advertencias
) {}
