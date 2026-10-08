package com.gestionfinanzas.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SuscripcionPushRequest(
        @NotBlank @Size(max = 2048) String endpoint,
        @NotNull @Valid ClavesPushRequest keys
) {
    public record ClavesPushRequest(
            @NotBlank @Size(max = 200) String p256dh,
            @NotBlank @Size(max = 100) String auth
    ) {}
}
