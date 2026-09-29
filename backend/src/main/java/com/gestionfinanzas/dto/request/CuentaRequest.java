package com.gestionfinanzas.dto.request;

import com.gestionfinanzas.model.enums.TipoCuenta;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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

    @Size(max = 60, message = "La institución financiera no puede superar 60 caracteres")
    String institucionFinanciera,

    @DecimalMin(value = "0.00", message = "El porcentaje de cashback no puede ser negativo")
    @DecimalMax(value = "100.00", message = "El porcentaje de cashback no puede superar 100")
    @Digits(integer = 3, fraction = 2, message = "El cashback debe tener hasta 2 decimales")
    BigDecimal cashbackPorcentaje,

    @DecimalMin(value = "0.01", message = "El límite mensual debe ser mayor a 0")
    @Digits(integer = 13, fraction = 2, message = "El límite mensual debe tener hasta 2 decimales")
    BigDecimal cashbackLimiteMensual,

    @DecimalMin(value = "0.01", message = "El límite de crédito debe ser mayor a 0")
    @Digits(integer = 13, fraction = 2, message = "El límite de crédito debe tener hasta 2 decimales")
    BigDecimal limiteCredito,

    @Min(value = 1, message = "El día de corte debe estar entre 1 y 31")
    @Max(value = 31, message = "El día de corte debe estar entre 1 y 31")
    Integer diaCorte,

    @Min(value = 1, message = "El día de pago debe estar entre 1 y 31")
    @Max(value = 31, message = "El día de pago debe estar entre 1 y 31")
    Integer diaPago,

    @DecimalMin(value = "0.00", message = "El saldo inicial no puede ser negativo")
    @Digits(integer = 13, fraction = 2, message = "El saldo inicial debe tener hasta 2 decimales")
    BigDecimal saldoInicial,

    @Size(min = 3, max = 10, message = "El código de moneda debe tener entre 3 y 10 caracteres")
    String moneda,

    @Size(max = 255, message = "La descripción no puede superar los 255 caracteres")
    String descripcion
) {}
