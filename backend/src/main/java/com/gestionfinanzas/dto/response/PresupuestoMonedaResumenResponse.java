package com.gestionfinanzas.dto.response;

import java.math.BigDecimal;

public record PresupuestoMonedaResumenResponse(
    String moneda,
    BigDecimal totalPresupuestado,
    BigDecimal totalGastado,
    BigDecimal totalDisponible,
    BigDecimal porcentajeConsumido
) {}
