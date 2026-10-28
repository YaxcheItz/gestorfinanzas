package com.gestionfinanzas.ai;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.List;

/** Selects the requested provider, then the first configured provider as a keyless-install fallback. */
@Component
@Primary
public class AiProviderRouter implements AiProvider {
    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(AiProviderRouter.class);
    private final AiProvider selected;
    private final String metricProvider;
    private final java.util.concurrent.Semaphore simultaneas=new java.util.concurrent.Semaphore(4);

    public AiProviderRouter(AiProperties properties, OpenAiProvider openAi,
                            GeminiAiProvider gemini, GroqAiProvider groq) {
        List<AiProvider> providers = List.of(groq, gemini, openAi);
        String requested = properties.provider() == null ? "groq" : properties.provider().trim().toLowerCase();
        AiProvider preferred = providers.stream().filter(provider -> requested.equals(provider.id())).findFirst()
                .orElse(groq);
        this.selected = preferred.isConfigured() ? preferred : providers.stream()
                .filter(AiProvider::isConfigured).findFirst().orElse(preferred);
        String providerId = selected.id();
        this.metricProvider = switch (String.valueOf(providerId)) {
            case "openai", "gemini", "groq" -> providerId;
            default -> "unknown";
        };
    }

    @Override public String id() { return selected.id(); }
    @Override public String model() { return selected.model(); }
    @Override public boolean isConfigured() { return selected.isConfigured(); }
    @Override public String generate(String prompt, int maxOutputTokens) {
        long started = System.nanoTime();
        String outcome = "provider_error";
        boolean acquired = false;
        try {
            if (prompt==null || prompt.length()>60000 || maxOutputTokens<1 || maxOutputTokens>1200) {
                outcome = "invalid_request";
                throw new AiProviderException("La solicitud supera el límite de IA. Reduce el texto o usa un reporte local.");
            }
            if (!simultaneas.tryAcquire()) {
                outcome = "busy";
                throw new AiProviderException("La IA está ocupada. Inténtalo más tarde.");
            }
            acquired = true;
            String respuesta=selected.generate(prompt,maxOutputTokens);
            if (respuesta==null || respuesta.length()>40000) {
                outcome = "invalid_response";
                throw new AiProviderException("La respuesta de IA supera el límite permitido.");
            }
            outcome = "success";
            return respuesta;
        } catch(AiUsagePolicy.Denied ex) {
            outcome="budget_denied";throw ex;
        } finally {
            if (acquired) simultaneas.release();
            // Fixed fields only: never log prompts, responses, exception messages or model identifiers.
            long elapsed = Math.max(0, java.util.concurrent.TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started));
            LOG.info("KAPTAL_AI_GENERATION provider={} outcome={} elapsed_ms={}", metricProvider, outcome, elapsed);
        }
    }
}
