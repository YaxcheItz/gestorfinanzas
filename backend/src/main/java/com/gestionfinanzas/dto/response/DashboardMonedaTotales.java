package com.gestionfinanzas.dto.response;

import java.math.BigDecimal;

public record DashboardMonedaTotales(String moneda, BigDecimal ingresos, BigDecimal gastos) {}
