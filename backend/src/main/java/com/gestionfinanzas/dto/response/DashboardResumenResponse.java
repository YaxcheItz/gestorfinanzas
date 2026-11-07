package com.gestionfinanzas.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record DashboardResumenResponse(
    BigDecimal balanceTotal,
    BigDecimal ingresosMes,
    BigDecimal gastosMes,
    BigDecimal balanceMes,
    BigDecimal tasaAhorro,
    int totalCuentas,
    int mes,
    int anio,
    List<TransaccionResponse> ultimosMovimientos,
    List<DashboardMonedaResumenResponse> resumenPorMoneda,
    List<TransaccionResponse> comprasMsiAnteriores
) {
    public DashboardResumenResponse(BigDecimal balanceTotal,BigDecimal ingresosMes,BigDecimal gastosMes,BigDecimal balanceMes,BigDecimal tasaAhorro,int totalCuentas,int mes,int anio,List<TransaccionResponse> ultimosMovimientos,List<DashboardMonedaResumenResponse> resumenPorMoneda) {
        this(balanceTotal,ingresosMes,gastosMes,balanceMes,tasaAhorro,totalCuentas,mes,anio,ultimosMovimientos,resumenPorMoneda,List.of());
    }
}
