package com.gestionfinanzas.ai;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Arrays;

@Service
public class AudioTranscriptionService {
    private static final int MAX_AUDIO_BYTES = 5 * 1024 * 1024;
    private static final String GROQ_MODEL = "whisper-large-v3-turbo";

    private final AiProperties.Groq groq;
    private final AiProperties.OpenAi openAi;
    private final RestClient groqClient;
    private final RestClient openAiClient;

    public AudioTranscriptionService(RestClient.Builder builder, AiProperties properties) {
        this.groq = properties.groq();
        this.openAi = properties.openai();
        String groqUrl = groq == null || groq.baseUrl() == null || groq.baseUrl().isBlank()
                ? "https://api.groq.com/openai/v1" : groq.baseUrl();
        String openAiUrl = openAi == null || openAi.baseUrl() == null || openAi.baseUrl().isBlank()
                ? "https://api.openai.com/v1" : openAi.baseUrl();
        this.groqClient = builder.clone().baseUrl(groqUrl).build();
        this.openAiClient = builder.clone().baseUrl(openAiUrl).build();
    }

    public String transcribir(byte[] audio, String mimeType) {
        if (audio == null || audio.length == 0) {
            throw new IllegalArgumentException("No recibí audio para transcribir.");
        }
        if (audio.length > MAX_AUDIO_BYTES) {
            throw new IllegalArgumentException("La grabación supera el máximo permitido de 5 MB.");
        }

        String contentType = mimeType == null ? "" : mimeType.split(";", 2)[0].trim().toLowerCase();
        String extension = switch (contentType) {
            case "audio/webm" -> "webm";
            case "audio/ogg" -> "ogg";
            case "audio/mp4", "audio/x-m4a" -> "m4a";
            case "audio/wav", "audio/x-wav" -> "wav";
            case "audio/mpeg" -> "mp3";
            default -> throw new IllegalArgumentException("El navegador envió un formato de audio no compatible.");
        };

        try {
            if (isConfigured(groq == null ? null : groq.apiKey())) {
                try {
                    return solicitar(groqClient, groq.apiKey(), GROQ_MODEL, audio, contentType, extension);
                } catch (RestClientException | AiProviderException groqFailure) {
                    if (!isConfigured(openAi == null ? null : openAi.apiKey())) {
                        throw new AiProviderException("Groq no pudo transcribir el audio. Inténtalo de nuevo.");
                    }
                }
            }
            if (isConfigured(openAi == null ? null : openAi.apiKey())) {
                return solicitar(openAiClient, openAi.apiKey(), "whisper-1", audio, contentType, extension);
            }
            throw new AiConfigurationException("Configura GROQ_API_KEY u OPENAI_API_KEY para habilitar el dictado en Firefox.");
        } finally {
            Arrays.fill(audio, (byte) 0);
        }
    }

    private String solicitar(RestClient client, String apiKey, String model, byte[] audio,
                             String contentType, String extension) {
        ByteArrayResource file = new ByteArrayResource(audio) {
            @Override public String getFilename() { return "kaptal-audio." + extension; }
        };
        HttpHeaders fileHeaders = new HttpHeaders();
        fileHeaders.setContentType(MediaType.parseMediaType(contentType));
        MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
        parts.add("file", new HttpEntity<>(file, fileHeaders));
        parts.add("model", model);
        parts.add("language", "es");
        parts.add("response_format", "json");
        parts.add("temperature", "0");

        try {
            JsonNode response = client.post()
                    .uri("/audio/transcriptions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(parts)
                    .retrieve()
                    .body(JsonNode.class);
            String text = response == null ? "" : response.path("text").asText("").trim();
            if (text.isBlank()) throw new AiProviderException("No detecté voz clara en la grabación.");
            return text;
        } catch (RestClientException ex) {
            throw new AiProviderException("El servicio de transcripción no está disponible. Inténtalo de nuevo.");
        }
    }

    private boolean isConfigured(String key) { return key != null && !key.isBlank(); }
}
