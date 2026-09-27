package com.gestionfinanzas.dto.response;

import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.enums.TipoCuenta;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CuentaResponse(
    Long id,
    String nombre,
    TipoCuenta tipo,
    String institucionFinanciera,
    BigDecimal saldoActual,
    String moneda,
    String descripcion,
    boolean activo,
    LocalDateTime fechaCreacion
) {
    public static CuentaResponse fromEntity(Cuenta cuenta) {
        return new CuentaResponse(
            cuenta.getId(),
            cuenta.getNombre(),
            cuenta.getTipo(),
            cuenta.getInstitucionFinanciera(),
            cuenta.getSaldoActual(),
            cuenta.getMoneda(),
            cuenta.getDescripcion(),
            cuenta.isActivo(),
            cuenta.getFechaCreacion()
        );
    }
}
