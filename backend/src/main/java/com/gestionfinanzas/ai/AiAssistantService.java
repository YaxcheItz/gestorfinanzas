package com.gestionfinanzas.ai;

import com.gestionfinanzas.dto.request.AiChatRequest;
import com.gestionfinanzas.dto.request.AiQuickCaptureRequest;
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
            throw new AiConfigurationException("La clave de " + provider.id() + " aún no está configurada en el backend.");
        }

        String prompt = "gemini".equals(provider.id())
                ? CONNECTION_TEST_PROMPT
                : "Devuelve un objeto JSON con la propiedad answer cuyo valor sea exactamente KAPTAL_IA_OK.";
        String response = provider.generate(prompt, 48);
        if (!response.contains("KAPTAL_IA_OK")) {
            throw new AiProviderException("El proveedor respondió, pero no pasó la verificación de conexión.");
        }
        return new AiVerificationResult(provider.id(), provider.model(), true);
    }

    public AiChatResponse chat(Long userId, AiChatRequest request) {
        validateConversation(request);
        String ultimo=request.messages().get(request.messages().size()-1).content();
        var local=actionService.interpretarCapturaRapida(userId, ultimo);
        if(local!=null)return respuestaLocal(local);
        if(!request.consentimientoDatosFinancieros()) throw new IllegalArgumentException("No encontr\u00e9 una regla local para ese texto. Activa el permiso para que la IA lo interprete.");
        if (!provider.isConfigured()) throw new AiConfigurationException("La IA no est\u00e1 configurada. Puedes seguir usando registros y reportes por reglas.");

        String conversation = request.messages().stream()
                .map(message -> (message.role() == AiChatRequest.Role.USER ? "Usuario" : "Asistente")
                        + ": " + message.content())
                .collect(java.util.stream.Collectors.joining("\n"));
        AiActionService.AiActionResult result = actionService.interpret(userId, conversation);
        return new AiChatResponse(result.answer(), result.action(), result.actions(), result.report());
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

    public record AiChatResponse(
            String answer,
            AiActionService.ActionProposal action,
            java.util.List<AiActionService.ActionProposal> actions,
            AiActionService.AiReportWidget report,
            String engine, java.util.List<String> suggestions, String contexto
    ) {
        public AiChatResponse(String answer, AiActionService.ActionProposal action, java.util.List<AiActionService.ActionProposal> actions, AiActionService.AiReportWidget report) {
            this(answer, action, actions, report, "IA", java.util.List.of(), null);
        }
        public AiChatResponse(String answer, AiActionService.ActionProposal action) {
            this(answer, action, action == null ? java.util.List.of() : java.util.List.of(action), null);
        }

        public AiChatResponse(String answer, AiActionService.ActionProposal action, java.util.List<AiActionService.ActionProposal> actions) {
            this(answer, action, actions, null);
        }
    }

    private AiChatResponse respuestaLocal(AiActionService.AiActionResult local) {
        return new AiChatResponse(local.answer(), local.action(), local.actions(), local.report(), "REGLAS", local.suggestions(), local.contexto());
    }

    public AiChatResponse quickCapture(Long userId, AiQuickCaptureRequest request) {
        String mensaje=request.content().strip();
        if(request.contexto()!=null&&!request.contexto().isBlank()) mensaje=request.contexto().strip()+" "+mensaje;
        if(mensaje.length()>1200) throw new IllegalArgumentException("El mensaje combinado es demasiado largo; escribe de nuevo el movimiento completo.");
        AiActionService.AiActionResult local = actionService.interpretarCapturaRapida(userId, mensaje);
        AiChatResponse response;
        if (local != null) {
            response = respuestaLocal(local);
        } else {
            if (!request.consentimientoDatosFinancieros()) {
                throw new IllegalArgumentException("No encontré una regla local para ese texto. Activa el permiso para que la IA lo interprete.");
            }
            response = chat(userId, new AiChatRequest(
                    java.util.List.of(new AiChatRequest.Message(AiChatRequest.Role.USER, mensaje)), true));
        }
        if ((response.action() != null && !"CREATE_TRANSACTION".equals(response.action().type()))
                || response.actions().stream().anyMatch(a -> !"CREATE_TRANSACTION".equals(a.type()))) {
            throw new IllegalArgumentException("Este chat registra movimientos y consulta reportes. Gestiona cuentas y borrados en Configuración.");
        }
        if (request.capturaPorVoz()) {
            actionService.marcarCapturaPorVoz(userId, response.action());
            response.actions().forEach(proposal -> actionService.marcarCapturaPorVoz(userId, proposal));
        }
        return response;
    }
}
