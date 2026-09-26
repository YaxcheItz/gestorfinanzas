package com.gestionfinanzas.dto.response;

import java.math.BigDecimal;

public record DashboardMonedaResumenResponse(
    String moneda,
    BigDecimal balanceTotal,
    BigDecimal ingresosMes,
    BigDecimal gastosMes,
    BigDecimal balanceMes,
    BigDecimal tasaAhorro,
    int totalCuentas
) {}
