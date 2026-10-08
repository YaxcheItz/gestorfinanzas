package com.gestionfinanzas.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;

@ConfigurationProperties(prefix = "app.ai")
public record AiProperties(
        String provider,
        String model,
        String fallbackModel,
        Gemini gemini,
        Groq groq,
        OpenAi openai
) {
    @ConstructorBinding
    public AiProperties {}

    public record Gemini(String apiKey, String baseUrl) {}

    public record Groq(String apiKey, String baseUrl, String model) {}

    public record OpenAi(String apiKey, String baseUrl, String model) {}

    public AiProperties(String provider, String model, String fallbackModel, Gemini gemini) {
        this(provider, model, fallbackModel, gemini, null, null);
    }

    public AiProperties(String provider, String model, String fallbackModel, Gemini gemini, Groq groq) {
        this(provider, model, fallbackModel, gemini, groq, null);
    }
}
