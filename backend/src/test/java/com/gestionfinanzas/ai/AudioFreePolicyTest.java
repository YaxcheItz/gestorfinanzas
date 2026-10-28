package com.gestionfinanzas.ai;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.web.client.RestClient;
import org.springframework.test.web.client.MockRestServiceServer;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AudioFreePolicyTest {
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(ints={1,2})
    @SuppressWarnings("unchecked")
    void eachGeminiFallbackReservesBudgetBeforeItsOwnHttpRequest(int limit) {
        var shared=mock(com.gestionfinanzas.security.LimiteAbusoCompartido.class);
        var calls=new java.util.concurrent.atomic.AtomicInteger();
        doAnswer(a->{if(calls.incrementAndGet()>limit)throw new com.gestionfinanzas.exception.TooManyRequestsException("synthetic",10);return null;})
            .when(shared).comprobar(anyString(),anyInt(),any());
        var stores=mock(ObjectProvider.class);when(stores.getIfAvailable()).thenReturn(shared);
        var policy=new AiUsagePolicy("gemini",limit,stores);
        var builder=RestClient.builder();var server=MockRestServiceServer.bindTo(builder).build();
        String base="https://generativelanguage.googleapis.com/v1beta";
        server.expect(requestTo(base+"/models/gemini-2.5-flash:generateContent"))
            .andRespond(withStatus(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS));
        if(limit==2)server.expect(requestTo(base+"/models/gemini-2.5-flash-lite:generateContent"))
            .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"synthetic\"}]}}]}",org.springframework.http.MediaType.APPLICATION_JSON));
        var properties=new AiProperties("gemini","gemini-2.5-flash","gemini-2.5-flash-lite",new AiProperties.Gemini("synthetic",base));
        var service=new GeminiAiProvider(builder,properties,policy);
        if(limit==1)assertThrows(AiUsagePolicy.Denied.class,()->service.generate("synthetic",20));
        else assertEquals("synthetic",service.generate("synthetic",20));
        assertEquals(2,calls.get());server.verify();
    }
    @SuppressWarnings("unchecked")
    AiUsagePolicy policy(int limit) { return new AiUsagePolicy("groq,gemini",limit,mock(ObjectProvider.class)); }
    AiProperties properties() {
        return new AiProperties("groq",null,null,null,
            new AiProperties.Groq("synthetic-groq","https://api.groq.com/openai/v1","openai/gpt-oss-20b"),
            new AiProperties.OpenAi("synthetic-unused-key","https://api.openai.com/v1","unused"));
    }
    @Test void failedGroqAudioNeverCallsOpenAiEvenWhenOldKeyIsPresentAndErasesAudio() {
        var builder=RestClient.builder();var server=MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.groq.com/openai/v1/audio/transcriptions")).andRespond(withServerError());
        var service=new AudioTranscriptionService(builder,properties(),policy(-1));var audio=new byte[]{1,2,3};
        assertThrows(AiProviderException.class,()->service.transcribir(audio,"audio/webm"));
        assertArrayEquals(new byte[3],audio);server.verify();
    }
    @Test void zeroBudgetPreventsTheFirstAudioRequestAndErasesAudio() {
        var builder=RestClient.builder();var server=MockRestServiceServer.bindTo(builder).build();
        var service=new AudioTranscriptionService(builder,properties(),policy(0));var audio=new byte[]{1,2,3};
        assertThrows(AiUsagePolicy.Denied.class,()->service.transcribir(audio,"audio/webm"));
        assertArrayEquals(new byte[3],audio);server.verify();
    }
    @Test void zeroBudgetPreventsTextRequestsToo() {
        var builder=RestClient.builder();var server=MockRestServiceServer.bindTo(builder).build();
        var service=new GroqAiProvider(builder,properties(),policy(0));
        assertThrows(AiUsagePolicy.Denied.class,()->service.generate("synthetic",20));server.verify();
    }
}
