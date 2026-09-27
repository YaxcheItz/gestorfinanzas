package com.gestionfinanzas.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CambiarPasswordRequest(
        @NotBlank(message = "La contraseña actual es obligatoria")
        String passwordActual,

        @NotBlank(message = "La nueva contraseña es obligatoria")
        @Size(min = 8, max = 72, message = "La nueva contraseña debe tener entre 8 y 72 caracteres")
        String passwordNueva
) {}
