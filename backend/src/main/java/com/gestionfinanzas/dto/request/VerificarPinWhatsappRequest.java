package com.gestionfinanzas.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VerificarPinWhatsappRequest(
        @NotBlank(message = "El teléfono es obligatorio")
        @Size(max = 16, message = "El teléfono no es válido")
        @Pattern(regexp = "^\\+?[1-9][0-9]{7,14}$", message = "El teléfono debe incluir el código de país")
        String telefono,

        @NotBlank(message = "El PIN es obligatorio")
        @Pattern(regexp = "^[0-9]{6}$", message = "El PIN debe tener seis dígitos")
        String pin
) {}
