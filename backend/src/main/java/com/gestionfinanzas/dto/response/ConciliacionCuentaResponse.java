package com.gestionfinanzas.dto.response;

import java.math.BigDecimal;

public record ConciliacionCuentaResponse(
        Long cuentaId,
        String cuentaNombre,
        String moneda,
        BigDecimal saldoOperativo,
        BigDecimal saldoLibroProyectado,
        BigDecimal diferencia
) {}
