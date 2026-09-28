package com.gestionfinanzas.dto.response;

import java.time.Instant;

public record AuditoriaTransaccionResponse(
        Long id,
        Long transaccionId,
        String accion,
        TransaccionResponse antes,
        TransaccionResponse despues,
        Instant fechaEvento
) {}
