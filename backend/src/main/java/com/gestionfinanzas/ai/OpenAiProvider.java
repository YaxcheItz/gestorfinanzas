package com.gestionfinanzas.ai;

import org.springframework.stereotype.Component;

/** Retains old configuration compatibility without any paid API transport. */
@Component
public class OpenAiProvider implements AiProvider {
    @Override public String id() { return "openai"; }
    @Override public String model() { return "disabled"; }
    @Override public boolean isConfigured() { return false; }
    @Override public String generate(String prompt,int maxOutputTokens) {
        throw new AiProviderException("Kaptal solo utiliza proveedores de IA en planes gratuitos.");
    }
}
