package com.gestionfinanzas.dto.response;

public record PinVinculacionWhatsappResponse(
        String pin,
        int vigenciaSegundos,
        String numeroBot
) {}
