package com.gestionfinanzas.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AiChatRequest(
        @NotEmpty(message = "Escribe un mensaje para el asistente")
        @Size(max = 10, message = "La conversación puede incluir como máximo 10 mensajes")
        List<@Valid Message> messages,
        boolean consentimientoDatosFinancieros
) {
    public AiChatRequest(List<Message> messages) {
        this(messages, false);
    }

    public record Message(
            @NotNull(message = "El rol del mensaje es obligatorio")
            Role role,
            @NotBlank(message = "El contenido del mensaje es obligatorio")
            @Size(min = 1, max = 1200, message = "Cada mensaje debe tener como máximo 1200 caracteres")
            String content
    ) {}

    public enum Role {
        USER,
        ASSISTANT
    }
}
