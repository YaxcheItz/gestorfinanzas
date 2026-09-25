package com.gestionfinanzas.dto.request;

import com.gestionfinanzas.model.enums.TipoTransaccion;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

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
    BigDecimal monto,

    @NotNull(message = "La fecha es obligatoria")
    LocalDate fecha,

    @NotBlank(message = "El concepto o descripción es obligatorio")
    @Size(min = 2, max = 200, message = "La descripción debe tener entre 2 y 200 caracteres")
    String descripcion,

    @Size(max = 500, message = "Las notas no pueden superar los 500 caracteres")
    String notas
) {}
