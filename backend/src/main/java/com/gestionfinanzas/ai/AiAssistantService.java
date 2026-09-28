package com.gestionfinanzas.ai;

import com.gestionfinanzas.dto.request.AiChatRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AiAssistantService {
    private static final String CONNECTION_TEST_PROMPT =
            "Responde exactamente con este texto y nada más: KAPTAL_IA_OK";

    private final AiProvider provider;
    private final AiActionService actionService;

    public AiConnectionStatus status() {
        return new AiConnectionStatus(provider.id(), provider.model(), provider.isConfigured());
    }

    public AiVerificationResult verifyConnection() {
        if (!provider.isConfigured()) {
            throw new AiConfigurationException("La clave de Gemini aún no está configurada en el backend.");
        }

        String response = provider.generate(CONNECTION_TEST_PROMPT, 24);
        if (!"KAPTAL_IA_OK".equals(response)) {
            throw new AiProviderException("Gemini respondió, pero no pasó la verificación de conexión.");
        }
        return new AiVerificationResult(provider.id(), provider.model(), true);
    }

    public AiChatResponse chat(Long userId, AiChatRequest request) {
        if (!provider.isConfigured()) {
            throw new AiConfigurationException("La clave de Gemini aún no está configurada en el backend.");
        }
        validateConversation(request);

        String conversation = request.messages().stream()
                .map(message -> (message.role() == AiChatRequest.Role.USER ? "Usuario" : "Asistente")
                        + ": " + message.content())
                .collect(java.util.stream.Collectors.joining("\n"));
        AiActionService.AiActionResult result = actionService.interpret(userId, conversation);
        return new AiChatResponse(result.answer(), result.action());
    }

    private void validateConversation(AiChatRequest request) {
        if (request.messages().get(request.messages().size() - 1).role() != AiChatRequest.Role.USER) {
            throw new IllegalArgumentException("El último mensaje de la conversación debe ser del usuario.");
        }
        for (int index = 0; index < request.messages().size(); index++) {
            AiChatRequest.Role expectedRole = index % 2 == 0
                    ? AiChatRequest.Role.USER
                    : AiChatRequest.Role.ASSISTANT;
            if (request.messages().get(index).role() != expectedRole) {
                throw new IllegalArgumentException("La conversación tiene un orden de mensajes inválido.");
            }
        }
    }

    public record AiConnectionStatus(String provider, String model, boolean configured) {}

    public record AiVerificationResult(String provider, String model, boolean connected) {}

    public record AiChatResponse(String answer, AiActionService.ActionProposal action) {}
}
