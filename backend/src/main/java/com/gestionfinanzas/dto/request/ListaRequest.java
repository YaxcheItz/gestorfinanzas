package com.gestionfinanzas.dto.request;

import jakarta.validation.constraints.*;

public record ListaRequest(
        @NotBlank @Size(max = 60) String nombre,
        @NotBlank @Size(max = 24) String emoji,
        @NotBlank @Pattern(regexp = "MXN|USD|CAD|EUR|GBP") String moneda) {}
