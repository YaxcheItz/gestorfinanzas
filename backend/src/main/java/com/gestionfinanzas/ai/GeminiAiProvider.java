package com.gestionfinanzas.ai;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

@Component
public class GeminiAiProvider implements AiProvider {
    @org.springframework.beans.factory.annotation.Autowired
    public GeminiAiProvider(RestClient.Builder builder,AiProperties properties,AiHttpClient cliente) {
        this(cliente.configurar(builder),properties);
    }
    private final AiProperties properties;
    private final RestClient restClient;

    public GeminiAiProvider(RestClient.Builder builder, AiProperties properties) {
        this.properties = properties;
        this.restClient = builder.baseUrl(properties.gemini().baseUrl()).build();
    }

    @Override
    public String id() {
        return "gemini";
    }

    @Override
    public String model() {
        return properties.model();
    }

    @Override
    public boolean isConfigured() {
        return properties.gemini().apiKey() != null && !properties.gemini().apiKey().isBlank();
    }

    @Override
    public String generate(String prompt, int maxOutputTokens) {
        if (!isConfigured()) {
            throw new AiConfigurationException("Configura GEMINI_API_KEY en el entorno del backend para conectar Gemini.");
        }

        try {
            return generateWithModel(properties.model(), prompt, maxOutputTokens);
        } catch (QuotaExceededException ex) {
            String fallbackModel = properties.fallbackModel();
            if (fallbackModel == null || fallbackModel.isBlank() || fallbackModel.equals(properties.model())) {
                throw new AiProviderException("Gemini alcanzó el límite de solicitudes. Inténtalo más tarde.");
            }
            try {
                return generateWithModel(fallbackModel, prompt, maxOutputTokens);
            } catch (QuotaExceededException fallbackException) {
                throw new AiProviderException("Gemini alcanzó el límite de solicitudes en los modelos configurados. Inténtalo más tarde.");
            }
        }
    }

    private String generateWithModel(String model, String prompt, int maxOutputTokens) {
        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("maxOutputTokens", maxOutputTokens);
        if (model.startsWith("gemini-2.5")) {
            generationConfig.put("thinkingConfig", Map.of("thinkingBudget", 0));
        }

        JsonNode response;
        try {
            response = restClient.post()
                    .uri("/models/{model}:generateContent", model)
                    .header("x-goog-api-key", properties.gemini().apiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                            "generationConfig", generationConfig
                    ))
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == HttpStatus.TOO_MANY_REQUESTS.value()) {
                throw new QuotaExceededException();
            }
            throw providerError(ex.getStatusCode());
        } catch (ResourceAccessException ex) {
            throw new AiProviderException("No fue posible conectar con Gemini. Revisa la conexión a internet.");
        }

        JsonNode candidate = response == null ? null : response.path("candidates").path(0);
        JsonNode parts = candidate == null ? null : candidate.path("content").path("parts");
        List<String> outputParts = new ArrayList<>();
        if (parts != null && parts.isArray()) {
            for (JsonNode part : parts) {
                if (!part.path("thought").asBoolean(false)) {
                    String partText = part.path("text").asText("");
                    if (!partText.isBlank()) {
                        outputParts.add(partText);
                    }
                }
            }
        }
        String text = String.join("", outputParts);
        if (text.isBlank()) {
            String finishReason = candidate == null ? "" : candidate.path("finishReason").asText("");
            String reasonDetail = finishReason.isBlank() ? "" : " Motivo: " + finishReason + ".";
            throw new AiProviderException("Gemini respondió sin texto." + reasonDetail
                    + " Revisa la configuración del proveedor e inténtalo de nuevo.");
        }
        return text.trim();
    }

    private AiProviderException providerError(HttpStatusCode status) {
        if (status.value() == HttpStatus.UNAUTHORIZED.value() || status.value() == HttpStatus.FORBIDDEN.value()) {
            return new AiProviderException("Gemini rechazó la clave. Verifica GEMINI_API_KEY en el backend.");
        }
        if (status.value() == HttpStatus.TOO_MANY_REQUESTS.value()) {
            return new AiProviderException("Gemini alcanzó el límite de solicitudes. Inténtalo más tarde.");
        }
        return new AiProviderException("Gemini no está disponible en este momento (HTTP " + status.value() + ").");
    }

    private static class QuotaExceededException extends AiProviderException {
        private QuotaExceededException() {
            super("Gemini alcanzó el límite de solicitudes.");
        }
    }
}
