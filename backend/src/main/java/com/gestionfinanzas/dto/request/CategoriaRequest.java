package com.gestionfinanzas.dto.request;

import com.gestionfinanzas.model.enums.TipoTransaccion;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CategoriaRequest(
    @NotBlank(message = "El nombre de la categoría es obligatorio")
    @Size(min = 2, max = 80, message = "El nombre debe tener entre 2 y 80 caracteres")
    String nombre,

    @NotNull(message = "El tipo de categoría es obligatorio")
    TipoTransaccion tipo,

    @Size(max = 50, message = "El icono no puede superar los 50 caracteres")
    String icono,

    @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "El color debe ser hexadecimal de seis dígitos")
    String color
) {}
