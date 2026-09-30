package com.gestionfinanzas.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ParejaCrearRequest(

        @NotBlank(message = "El correo de tu pareja es obligatorio")
        @Email(message = "El correo de tu pareja no es válido")
        @Size(max = 150, message = "El correo no puede superar 150 caracteres")
        String email
) {}
