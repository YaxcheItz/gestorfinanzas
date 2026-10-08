package com.gestionfinanzas.dto.request;

import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.model.enums.FrecuenciaRecurrencia;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Digits;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransaccionRequest(
    @NotNull(message = "La cuenta es obligatoria")
    Long cuentaId,

    Long cuentaDestinoId,

    Long categoriaId,

    @NotNull(message = "El tipo de transacción es obligatorio")
    TipoTransaccion tipo,

    @NotNull(message = "El monto es obligatorio")
    @DecimalMin(value = "0.01", message = "El monto debe ser estrictamente mayor a 0")
    @Digits(integer = 13, fraction = 2, message = "El monto debe tener hasta 2 decimales")
    BigDecimal monto,

    @DecimalMin(value = "0.00000001", message = "La tasa de cambio debe ser mayor a 0")
    @Digits(integer = 12, fraction = 8, message = "La tasa debe tener hasta 8 decimales")
    BigDecimal tasaCambio,

    @NotNull(message = "La fecha es obligatoria")
    LocalDate fecha,

    @Size(max = 200, message = "La descripción no puede superar los 200 caracteres")
    String descripcion,

    @Size(max = 500, message = "Las notas no pueden superar los 500 caracteres")
    String notas,

    FrecuenciaRecurrencia frecuenciaRecurrencia,

    LocalDate siguienteFechaRecurrencia,

    @jakarta.validation.constraints.Min(value = 2, message = "Los MSI deben tener al menos 2 cuotas")
    @jakarta.validation.constraints.Max(value = 60, message = "Los MSI admiten hasta 60 cuotas")
    Integer msi
) {}
