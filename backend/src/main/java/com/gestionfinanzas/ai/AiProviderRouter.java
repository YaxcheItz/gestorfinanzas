package com.gestionfinanzas.ai;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.List;

/** Selects the requested provider, then the first configured provider as a keyless-install fallback. */
@Component
@Primary
public class AiProviderRouter implements AiProvider {
    private final AiProvider selected;
    private final java.util.concurrent.Semaphore simultaneas=new java.util.concurrent.Semaphore(4);

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
        if (prompt==null || prompt.length()>60000 || maxOutputTokens<1 || maxOutputTokens>1200)
            throw new AiProviderException("La solicitud supera el límite de IA. Reduce el texto o usa un reporte local.");
        if (!simultaneas.tryAcquire()) throw new AiProviderException("La IA está ocupada. Inténtalo más tarde.");
        try {
            String respuesta=selected.generate(prompt,maxOutputTokens);
            if (respuesta==null || respuesta.length()>40000) throw new AiProviderException("La respuesta de IA supera el límite permitido.");
            return respuesta;
        } finally { simultaneas.release(); }
    }
}
