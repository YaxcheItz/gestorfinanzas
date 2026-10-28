package com.gestionfinanzas.ai;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"GEMINI_API_KEY=synthetic-inherited-key","GROQ_API_KEY=synthetic-inherited-key",
    "OPENAI_API_KEY=synthetic-inherited-key","AI_PROVIDER=groq"})
@ActiveProfiles("test")
class AiTestIsolationTest {
    @Autowired AiProperties properties;
    @Autowired GeminiAiProvider gemini;
    @Autowired GroqAiProvider groq;
    @Autowired AiProviderRouter router;
    @Autowired AiUsagePolicy policy;

    @Test void inheritedKeysCannotEnableProvidersInTheSpringTestProfile() {
        // Boolean assertions never echo a credential if isolation regresses.
        assertTrue(properties.gemini().apiKey()==null||properties.gemini().apiKey().isBlank());
        assertTrue(properties.groq().apiKey()==null||properties.groq().apiKey().isBlank());
        assertFalse(gemini.isConfigured());assertFalse(groq.isConfigured());assertFalse(router.isConfigured());
        assertFalse(policy.enabled("groq","openai/gpt-oss-20b"));
        assertFalse(policy.enabled("gemini","gemini-3.5-flash-lite"));
    }
    @Test void requestsAreRejectedBeforeHttpEvenWithInheritedKeyNames() {
        assertFalse(gemini.isConfigured());assertFalse(groq.isConfigured());
        assertThrows(AiConfigurationException.class,()->gemini.generate("synthetic",20));
        assertThrows(AiConfigurationException.class,()->groq.generate("synthetic",20));
        assertThrows(AiUsagePolicy.Denied.class,()->policy.reserve("groq","openai/gpt-oss-20b","https://api.groq.com/openai/v1"));
    }
}
