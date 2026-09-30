package com.gestionfinanzas.dto.request;

import com.gestionfinanzas.model.enums.TipoReparto;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Gasto compartido con su reparto.
 *
 * Solo se pide el dato de la pareja, nunca los dos: la parte de quien registra
 * sale de restar del total. Pedir los dos amounts dejaba la puerta abierta a que
 * no sumaran y el gasto quedara descuadrado.
 *
 * - {@code IGUAL} reparte a la mitad, no usa ningún campo extra.
 * - {@code PORCENTAJE} usa {@code porcentajePareja}, y la parte de quien
 *   registra es el resto hasta el cien.
 * - {@code EXACTO} usa {@code montoExactoPareja}, y la parte de quien registra
 *   es el resto del total.
 */
public record GastoParejaRequest(

        @NotNull(message = "El monto es obligatorio")
        @DecimalMin(value = "0.01", message = "El monto debe ser mayor a 0")
        @Digits(integer = 13, fraction = 2, message = "El monto debe tener hasta 2 decimales")
        BigDecimal monto,

        @NotNull(message = "La fecha es obligatoria")
        LocalDate fecha,

        @NotBlank(message = "La descripción es obligatoria")
        @Size(max = 200, message = "La descripción no puede superar 200 caracteres")
        String descripcion,

        @NotNull(message = "El tipo de reparto es obligatorio")
        TipoReparto tipoReparto,

        @DecimalMin(value = "0.01", message = "El porcentaje debe ser mayor a 0")
        @Digits(integer = 3, fraction = 2, message = "El porcentaje debe tener hasta 2 decimales")
        BigDecimal porcentajePareja,

        @DecimalMin(value = "0.01", message = "El monto exacto debe ser mayor a 0")
        @Digits(integer = 13, fraction = 2, message = "El monto exacto debe tener hasta 2 decimales")
        BigDecimal montoExactoPareja
) {}
