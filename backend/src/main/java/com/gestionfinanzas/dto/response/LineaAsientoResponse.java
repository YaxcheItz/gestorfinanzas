package com.gestionfinanzas.dto.response;

import com.gestionfinanzas.model.entity.LineaAsiento;
import com.gestionfinanzas.model.enums.LadoContable;

import java.math.BigDecimal;

public record LineaAsientoResponse(
        Long id,
        String codigoCuenta,
        String nombreCuenta,
        BigDecimal monto,
        String moneda,
        LadoContable lado,
        Long cuentaFinancieraId,
        Long categoriaId
) {
    public static LineaAsientoResponse fromEntity(LineaAsiento linea) {
        return new LineaAsientoResponse(
                linea.getId(), linea.getCodigoCuenta(), linea.getNombreCuenta(), linea.getMonto(),
                linea.getMoneda(), linea.getLado(), linea.getCuentaFinancieraId(), linea.getCategoriaId()
        );
    }
}
