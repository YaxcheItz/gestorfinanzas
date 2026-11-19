package com.gestionfinanzas.ai;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

@Component
public class GroqAiProvider implements AiProvider {
    @org.springframework.beans.factory.annotation.Autowired
    public GroqAiProvider(RestClient.Builder builder,AiProperties properties,AiHttpClient cliente,AiUsagePolicy policy) {
        this(cliente.configurar(builder),cliente.configurarCaptura(builder),properties,policy);
    }
    private static final String DEFAULT_MODEL = "openai/gpt-oss-20b";
    private static final Logger LOG = LoggerFactory.getLogger(GroqAiProvider.class);
    private static final Pattern QUOTA_VALUE = Pattern.compile("0|[1-9][0-9]{0,14}");

    private final AiProperties.Groq properties;
    private final RestClient restClient;
    private final RestClient capturaClient;
    private final AiUsagePolicy policy;
    private final String endpoint;

    public GroqAiProvider(RestClient.Builder builder, AiProperties properties,AiUsagePolicy policy) {
        this(builder, builder.clone(), properties, policy);
    }

    private GroqAiProvider(RestClient.Builder builder, RestClient.Builder capturaBuilder, AiProperties properties,AiUsagePolicy policy) {
        this.properties = properties.groq();
        this.policy=policy;
        String baseUrl = this.properties == null || this.properties.baseUrl() == null
                || this.properties.baseUrl().isBlank() ? "https://api.groq.com/openai/v1" : this.properties.baseUrl();
        this.restClient = builder.baseUrl(baseUrl).build();
        this.capturaClient = capturaBuilder.baseUrl(baseUrl).build();
        this.endpoint=baseUrl;
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
        return properties != null && properties.apiKey() != null && !properties.apiKey().isBlank() && policy.enabled(id(),model());
    }

    @Override
    public String generate(String prompt, int maxOutputTokens) {
        return generateWith(restClient, prompt, maxOutputTokens);
    }

    public String generateCaptura(String prompt, int maxOutputTokens) {
        return generateWith(capturaClient, prompt, maxOutputTokens);
    }

    private String generateWith(RestClient client, String prompt, int maxOutputTokens) {
        if (!isConfigured()) {
            throw new AiConfigurationException("Configura GROQ_API_KEY en el entorno del backend para conectar Groq.");
        }

        policy.reserve(id(),model(),endpoint);
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

            var result = client.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + properties.apiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toEntity(JsonNode.class);

            recordQuotaLimits(result.getHeaders());
            JsonNode response = result.getBody();
            AiTokenMetrics.groq(response);
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
                recordQuotaLimits(ex.getResponseHeaders());
                throw new AiProviderException("Groq alcanzó el límite de solicitudes. Inténtalo más tarde.");
            }
            throw new AiProviderException("Groq no está disponible en este momento (HTTP " + status + ").");
        } catch (ResourceAccessException ex) {
            throw new AiProviderException("No fue posible conectar con Groq. Revisa la conexión a internet.");
        }
    }

    private void recordQuotaLimits(HttpHeaders headers) {
        if (headers == null) return;
        // Groq defines these units in https://console.groq.com/docs/rate-limits#rate-limit-headers
        recordQuotaLimit(headers, "x-ratelimit-limit-requests", "requests_per_day");
        recordQuotaLimit(headers, "x-ratelimit-limit-tokens", "tokens_per_minute");
    }

    private void recordQuotaLimit(HttpHeaders headers, String headerName, String dimension) {
        List<String> values = headers.get(headerName);
        if (values != null && values.size() == 1 && QUOTA_VALUE.matcher(values.getFirst()).matches()) {
            LOG.info("KAPTAL_AI_GROQ_LIMIT dimension={} value={}", dimension, values.getFirst());
        }
    }
}
