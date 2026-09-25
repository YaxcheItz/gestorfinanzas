package com.gestionfinanzas.dto.request;

import com.gestionfinanzas.model.enums.TipoCuenta;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CuentaRequest(
    @NotBlank(message = "El nombre de la cuenta es obligatorio")
    @Size(min = 2, max = 100, message = "El nombre debe tener entre 2 y 100 caracteres")
    String nombre,

    @NotNull(message = "El tipo de cuenta es obligatorio")
    TipoCuenta tipo,

    @DecimalMin(value = "0.00", message = "El saldo inicial no puede ser negativo")
    BigDecimal saldoInicial,

    @Size(min = 3, max = 10, message = "El código de moneda debe tener entre 3 y 10 caracteres")
    String moneda,

    @Size(max = 255, message = "La descripción no puede superar los 255 caracteres")
    String descripcion
) {}
