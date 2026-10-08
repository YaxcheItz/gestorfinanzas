package com.gestionfinanzas.ai;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.HashMap;
import java.util.Map;

@Component
public class GroqAiProvider implements AiProvider {
    private static final String DEFAULT_MODEL = "openai/gpt-oss-20b";

    private final AiProperties.Groq properties;
    private final RestClient restClient;

    public GroqAiProvider(RestClient.Builder builder, AiProperties properties) {
        this.properties = properties.groq();
        String baseUrl = this.properties == null || this.properties.baseUrl() == null
                || this.properties.baseUrl().isBlank() ? "https://api.groq.com/openai/v1" : this.properties.baseUrl();
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    @Override
    public String id() {
        return "groq";
    }

    @Override
    public String model() {
        return properties == null || properties.model() == null || properties.model().isBlank()
                ? DEFAULT_MODEL : properties.model();
    }

    @Override
    public boolean isConfigured() {
        return properties != null && properties.apiKey() != null && !properties.apiKey().isBlank();
    }

    @Override
    public String generate(String prompt, int maxOutputTokens) {
        if (!isConfigured()) {
            throw new AiConfigurationException("Configura GROQ_API_KEY en el entorno del backend para conectar Groq.");
        }

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("model", model());
            payload.put("messages", List.of(Map.of("role", "user", "content", prompt)));
            payload.put("temperature", 0.2);
            payload.put("response_format", Map.of("type", "json_object"));
            if (model().startsWith("openai/gpt-oss")) {
                payload.put("max_completion_tokens", maxOutputTokens);
                payload.put("reasoning_format", "hidden");
                payload.put("reasoning_effort", "low");
            } else {
                payload.put("max_tokens", maxOutputTokens);
            }

            JsonNode response = restClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + properties.apiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(JsonNode.class);

            String text = response == null ? "" : response.path("choices").path(0)
                    .path("message").path("content").asText("").trim();
            if (text.isBlank()) {
                throw new AiProviderException("Groq respondió sin texto. Inténtalo de nuevo.");
            }
            return text;
        } catch (RestClientResponseException ex) {
            int status = ex.getStatusCode().value();
            if (status == HttpStatus.UNAUTHORIZED.value() || status == HttpStatus.FORBIDDEN.value()) {
                throw new AiProviderException("Groq rechazó la clave. Verifica GROQ_API_KEY en el backend.");
            }
            if (status == HttpStatus.TOO_MANY_REQUESTS.value()) {
                throw new AiProviderException("Groq alcanzó el límite de solicitudes. Inténtalo más tarde.");
            }
            throw new AiProviderException("Groq no está disponible en este momento (HTTP " + status + ").");
        } catch (ResourceAccessException ex) {
            throw new AiProviderException("No fue posible conectar con Groq. Revisa la conexión a internet.");
        }
    }
}
