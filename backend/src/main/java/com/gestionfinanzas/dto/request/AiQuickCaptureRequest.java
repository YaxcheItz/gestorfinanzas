package com.gestionfinanzas.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiQuickCaptureRequest(
        @NotBlank(message = "Escribe qué movimiento quieres registrar")
        @Size(max = 1200, message = "El mensaje puede tener como máximo 1200 caracteres")
        String content,
        boolean consentimientoDatosFinancieros,
        boolean capturaPorVoz,
        @Size(max = 1200) String contexto,
        @jakarta.validation.constraints.Min(1) Long listaId
) {
    public AiQuickCaptureRequest(String content, boolean consentimientoDatosFinancieros, boolean capturaPorVoz, String contexto) {
        this(content, consentimientoDatosFinancieros, capturaPorVoz, contexto, null);
    }
    public AiQuickCaptureRequest(String content, boolean consentimientoDatosFinancieros, boolean capturaPorVoz) {
        this(content, consentimientoDatosFinancieros, capturaPorVoz, null, null);
    }
}
