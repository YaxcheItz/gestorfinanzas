package com.gestionfinanzas.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record PresupuestoRequest(
        @NotNull(message = "La categoría es obligatoria")
        Long categoriaId,

        @NotNull(message = "El monto límite es obligatorio")
        @Positive(message = "El monto límite debe ser mayor a cero")
        BigDecimal montoLimite,

        @NotNull(message = "El mes es obligatorio")
        @Min(value = 1, message = "El mes debe estar entre 1 y 12")
        @Max(value = 12, message = "El mes debe estar entre 1 y 12")
        Integer mes,

        @NotNull(message = "El año es obligatorio")
        @Min(value = 2000, message = "El año debe ser válido (>= 2000)")
        @Max(value = 2100, message = "El año debe ser válido (<= 2100)")
        Integer anio
) {
}
