package com.gestionfinanzas.ai;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class OpenAiProvider implements AiProvider {
    private static final String DEFAULT_MODEL = "gpt-4.1-mini";
    private final AiProperties.OpenAi properties;
    private final RestClient restClient;

    public OpenAiProvider(RestClient.Builder builder, AiProperties properties) {
        this.properties = properties.openai();
        String baseUrl = this.properties == null || this.properties.baseUrl() == null
                || this.properties.baseUrl().isBlank()
                ? "https://api.openai.com/v1"
                : this.properties.baseUrl();
        this.restClient = builder.baseUrl(baseUrl).build();
    }
    @org.springframework.beans.factory.annotation.Autowired
    public OpenAiProvider(RestClient.Builder builder,AiProperties properties,AiHttpClient cliente) {
        this(cliente.configurar(builder),properties);
    }

    @Override
    public String id() {
        return "openai";
    }

    @Override
    public String model() {
        return properties == null || properties.model() == null || properties.model().isBlank()
                ? DEFAULT_MODEL
                : properties.model();
    }

    @Override
    public boolean isConfigured() {
        return properties != null && properties.apiKey() != null && !properties.apiKey().isBlank();
    }

    @Override
    public String generate(String prompt, int maxOutputTokens) {
        if (!isConfigured()) {
            throw new AiConfigurationException("Configura OPENAI_API_KEY en el entorno del backend para conectar OpenAI.");
        }

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("model", model());
            payload.put("messages", List.of(Map.of("role", "user", "content", prompt)));
            payload.put("temperature", 0.2);
            payload.put("max_completion_tokens", maxOutputTokens);
            payload.put("response_format", Map.of("type", "json_object"));

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
                throw new AiProviderException("OpenAI respondió sin texto. Inténtalo de nuevo.");
            }
            return text;
        } catch (RestClientResponseException ex) {
            int status = ex.getStatusCode().value();
            if (status == HttpStatus.UNAUTHORIZED.value() || status == HttpStatus.FORBIDDEN.value()) {
                throw new AiProviderException("OpenAI rechazó la clave. Verifica OPENAI_API_KEY en el backend.");
            }
            if (status == HttpStatus.TOO_MANY_REQUESTS.value()) {
                throw new AiProviderException("OpenAI alcanzó el límite de solicitudes. Inténtalo más tarde.");
            }
            throw new AiProviderException("OpenAI no está disponible en este momento (HTTP " + status + ").");
        } catch (ResourceAccessException ex) {
            throw new AiProviderException("No fue posible conectar con OpenAI. Revisa la conexión a internet.");
        }
    }
}
