package com.gestionfinanzas.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record PresupuestoResumenResponse(
        int mes,
        int anio,
        BigDecimal totalPresupuestado,
        BigDecimal totalGastado,
        BigDecimal totalDisponible,
        BigDecimal porcentajeConsumidoGlobal,
        List<PresupuestoResponse> presupuestos,
        List<PresupuestoMonedaResumenResponse> resumenPorMoneda
) {
}
