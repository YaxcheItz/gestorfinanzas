package com.gestionfinanzas.ai;

import com.gestionfinanzas.security.LimiteAbusoCompartido;
import com.gestionfinanzas.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import java.time.Duration;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiUsagePolicyTest {
    @SuppressWarnings("unchecked")
    AiUsagePolicy policy(String providers,int limit,LimiteAbusoCompartido shared) {
        var stores=mock(ObjectProvider.class);when(stores.getIfAvailable()).thenReturn(shared);
        return new AiUsagePolicy(providers,limit,stores);
    }
    @Test void onlyConfirmedFreeProvidersFixedModelsAndOfficialEndpointsCanSend() {
        var policy=policy("groq,gemini",-1,null);
        assertDoesNotThrow(()->policy.reserve("groq","openai/gpt-oss-20b","https://api.groq.com/openai/v1"));
        assertDoesNotThrow(()->policy.reserve("gemini","gemini-2.5-flash-lite","https://generativelanguage.googleapis.com/v1beta/"));
        assertThrows(AiUsagePolicy.Denied.class,()->policy.reserve("openai","gpt-4.1-mini","https://api.openai.com/v1"));
        assertThrows(AiUsagePolicy.Denied.class,()->policy.reserve("groq","unknown","https://api.groq.com/openai/v1"));
        assertThrows(AiUsagePolicy.Denied.class,()->policy.reserve("gemini","gemini-flash-lite-latest","https://generativelanguage.googleapis.com/v1beta"));
        assertThrows(AiUsagePolicy.Denied.class,()->policy.reserve("groq","openai/gpt-oss-20b","https://example.test/openai/v1"));
        assertThrows(AiUsagePolicy.Denied.class,()->policy("",-1,null).reserve("groq","openai/gpt-oss-20b","https://api.groq.com/openai/v1"));
    }
    @Test void budgetIncludesBothProvidersAndAudioInTheSameAtomicWindow() {
        var shared=mock(LimiteAbusoCompartido.class);
        var first=policy("groq,gemini",20,shared);var second=policy("groq,gemini",20,shared);
        first.reserve("groq","openai/gpt-oss-20b","https://api.groq.com/openai/v1");
        second.reserve("groq","whisper-large-v3-turbo","https://api.groq.com/openai/v1");
        second.reserve("gemini","gemini-2.5-flash","https://generativelanguage.googleapis.com/v1beta");
        verify(shared,times(3)).comprobar("ai:global:requests",20,Duration.ofDays(1));
    }
    @Test void zeroBlocksWithoutDatabaseAndDisabledBudgetDoesNotConsumeDatabase() {
        var shared=mock(LimiteAbusoCompartido.class);
        assertThrows(AiUsagePolicy.Denied.class,()->policy("groq",0,shared).reserve("groq","openai/gpt-oss-20b","https://api.groq.com/openai/v1"));
        policy("groq",-1,shared).reserve("groq","openai/gpt-oss-20b","https://api.groq.com/openai/v1");
        verifyNoInteractions(shared);
    }
    @Test void positiveBudgetRequiresSharedStorageAndInvalidConfigFailsAtStartup() {
        assertThrows(IllegalStateException.class,()->policy("groq",1,null));
        assertThrows(IllegalArgumentException.class,()->policy("openai",-1,null));
        assertThrows(IllegalArgumentException.class,()->policy("groq",-2,null));
        assertThrows(IllegalArgumentException.class,()->policy("groq",Integer.MAX_VALUE,null));
    }
    @Test void exhaustedOrUnavailableBudgetNeverFallsBackToAnInstanceCounter() {
        var shared=mock(LimiteAbusoCompartido.class);var policy=policy("groq",1,shared);
        doThrow(new TooManyRequestsException("private synthetic error",10)).when(shared).comprobar(anyString(),anyInt(),any());
        var error=assertThrows(AiUsagePolicy.Denied.class,()->policy.reserve("groq","openai/gpt-oss-20b","https://api.groq.com/openai/v1"));
        assertFalse(error.getMessage().contains("private"));
        doThrow(new IllegalStateException("private synthetic database error")).when(shared).comprobar(anyString(),anyInt(),any());
        assertThrows(AiUsagePolicy.Denied.class,()->policy.reserve("groq","openai/gpt-oss-20b","https://api.groq.com/openai/v1"));
        verify(shared,times(2)).comprobar(anyString(),anyInt(),any());
    }
    @Test void legacyOpenAiConfigurationCannotEnablePaidFallback() {
        var openai=new OpenAiProvider();assertFalse(openai.isConfigured());
        assertThrows(AiProviderException.class,()->openai.generate("synthetic",20));
        var groq=mock(GroqAiProvider.class);when(groq.id()).thenReturn("groq");when(groq.isConfigured()).thenReturn(true);
        var gemini=mock(GeminiAiProvider.class);when(gemini.id()).thenReturn("gemini");
        var router=new AiProviderRouter(new AiProperties("openai",null,null,null),openai,gemini,groq);
        assertEquals("groq",router.id());
    }
}
