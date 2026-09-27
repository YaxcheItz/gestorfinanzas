package com.gestionfinanzas.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PerfilActualizarRequest(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "El nombre no puede superar 100 caracteres")
        String nombre,

        @NotBlank(message = "El correo electrónico es obligatorio")
        @Email(message = "El correo electrónico no es válido")
        @Size(max = 150, message = "El correo electrónico no puede superar 150 caracteres")
        String email,

        @NotBlank(message = "El tema es obligatorio")
        @Pattern(regexp = "CLARO|OSCURO", message = "El tema debe ser CLARO u OSCURO")
        String tema,

        @NotBlank(message = "La moneda predeterminada es obligatoria")
        @Pattern(regexp = "MXN|USD|CAD|EUR|GBP", message = "La moneda predeterminada no está disponible")
        String monedaPredeterminada
) {}
