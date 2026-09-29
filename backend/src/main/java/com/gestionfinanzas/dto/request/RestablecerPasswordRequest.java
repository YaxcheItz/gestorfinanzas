package com.gestionfinanzas.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RestablecerPasswordRequest(
        @NotBlank(message = "El enlace de recuperación no es válido")
        @Size(min = 40, max = 100, message = "El enlace de recuperación no es válido")
        String token,

        @NotBlank(message = "La nueva contraseña es obligatoria")
        @Size(min = 8, max = 20, message = "La contraseña debe tener entre 8 y 20 caracteres")
        String passwordNueva
) {}
