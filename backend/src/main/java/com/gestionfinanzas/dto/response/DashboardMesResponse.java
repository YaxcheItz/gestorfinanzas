package com.gestionfinanzas.dto.response;

import java.math.BigDecimal;

public record DashboardMesResponse(
    int anio,
    int mes,
    BigDecimal ingresos,
    BigDecimal gastos
) {}
