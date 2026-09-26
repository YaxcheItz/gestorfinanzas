package com.gestionfinanzas.dto.response;

import com.gestionfinanzas.model.enums.TipoTransaccion;

import java.math.BigDecimal;

public record DashboardMesTipoTotal(
    int anio,
    int mes,
    TipoTransaccion tipo,
    BigDecimal monto
) {}
