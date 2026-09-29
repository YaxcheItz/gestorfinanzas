package com.gestionfinanzas.dto.request;

import jakarta.validation.constraints.AssertTrue;

public record BackfillLibroDiarioRequest(
        @AssertTrue(message = "Debes confirmar la incorporación al libro diario")
        boolean confirmar
) {}
