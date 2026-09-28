package com.gestionfinanzas.dto.response;

import java.math.BigDecimal;

public record DashboardComparacionMonedaResponse(
        String moneda,
        BigDecimal ingresosActuales,
        BigDecimal gastosActuales,
        BigDecimal ingresosAnteriores,
        BigDecimal gastosAnteriores,
        BigDecimal variacionGastos,
        BigDecimal variacionGastosPorcentaje
) {}
