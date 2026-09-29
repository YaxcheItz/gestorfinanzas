package com.gestionfinanzas.dto.response;

import java.math.BigDecimal;

public record ConciliacionMonedaResponse(
        BigDecimal debe,
        BigDecimal haber,
        BigDecimal diferencia
) {}
