package com.gestionfinanzas.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ai")
public record AiProperties(
        String provider,
        String model,
        String fallbackModel,
        Gemini gemini
) {
    public record Gemini(String apiKey, String baseUrl) {}
}
