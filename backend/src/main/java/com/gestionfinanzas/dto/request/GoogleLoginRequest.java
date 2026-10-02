package com.gestionfinanzas.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoogleLoginRequest(
        @NotBlank(message = "La credencial de Google es obligatoria")
        @Size(max = 4096, message = "La credencial de Google no es válida")
        String credential
) {}
