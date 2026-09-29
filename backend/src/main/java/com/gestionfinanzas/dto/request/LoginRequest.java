package com.gestionfinanzas.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
    @NotBlank(message = "El email es obligatorio")
    @Email(message = "El formato de email no es válido")
    @Size(max = 150, message = "El correo no puede superar 150 caracteres")
    String email,

    @NotBlank(message = "La contraseña es obligatoria")
    String password
) {}
