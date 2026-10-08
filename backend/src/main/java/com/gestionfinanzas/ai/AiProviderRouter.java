package com.gestionfinanzas.ai;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.List;

/** Selects the requested provider, then the first configured provider as a keyless-install fallback. */
@Component
@Primary
public class AiProviderRouter implements AiProvider {
    private final AiProvider selected;

    public AiProviderRouter(AiProperties properties, OpenAiProvider openAi,
                            GeminiAiProvider gemini, GroqAiProvider groq) {
        List<AiProvider> providers = List.of(openAi, gemini, groq);
        String requested = properties.provider() == null ? "openai" : properties.provider().trim().toLowerCase();
        AiProvider preferred = providers.stream().filter(provider -> provider.id().equals(requested)).findFirst()
                .orElse(openAi);
        this.selected = preferred.isConfigured() ? preferred : providers.stream()
                .filter(AiProvider::isConfigured).findFirst().orElse(preferred);
    }

    @Override public String id() { return selected.id(); }
    @Override public String model() { return selected.model(); }
    @Override public boolean isConfigured() { return selected.isConfigured(); }
    @Override public String generate(String prompt, int maxOutputTokens) {
        return selected.generate(prompt, maxOutputTokens);
    }
}
