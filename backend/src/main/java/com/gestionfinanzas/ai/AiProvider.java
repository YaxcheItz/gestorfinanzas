package com.gestionfinanzas.ai;

public interface AiProvider {
    String id();

    String model();

    boolean isConfigured();

    String generate(String prompt, int maxOutputTokens);
}
