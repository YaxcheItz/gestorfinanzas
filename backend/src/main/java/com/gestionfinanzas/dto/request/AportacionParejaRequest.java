package com.gestionfinanzas.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AportacionParejaRequest(

        @NotNull(message = "El monto es obligatorio")
        @DecimalMin(value = "0.01", message = "El monto debe ser mayor a 0")
        @Digits(integer = 13, fraction = 2, message = "El monto debe tener hasta 2 decimales")
        BigDecimal monto,

        @NotNull(message = "La fecha es obligatoria")
        LocalDate fecha,

        @Size(max = 500, message = "Las notas no pueden superar 500 caracteres")
        String notas
) {}
