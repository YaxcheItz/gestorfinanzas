package com.gestionfinanzas.dto.response;

public record VerificarPinWhatsappResponse(
        boolean verificado,
        Long usuarioId
) {}
