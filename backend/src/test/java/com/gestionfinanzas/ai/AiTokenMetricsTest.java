package com.gestionfinanzas.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import ch.qos.logback.classic.*;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.test.web.client.MockRestServiceServer;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiTokenMetricsTest {
    private final ObjectMapper mapper=new ObjectMapper();
    private final Logger logger=(Logger)LoggerFactory.getLogger(AiTokenMetrics.class);
    private final ListAppender<ILoggingEvent> logs=new ListAppender<>();
    private Level previous;
    @BeforeEach void capture() { previous=logger.getLevel();logger.setLevel(Level.INFO);logs.start();logger.addAppender(logs); }
    @AfterEach void cleanup() { logger.detachAppender(logs);logs.stop();logger.setLevel(previous); }
    @Test void geminiKeepsProviderTotalIncludingThoughtsWithoutDoubleCounting() throws Exception {
        AiTokenMetrics.gemini(mapper.readTree("""
            {"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":3,"thoughtsTokenCount":4,
            "cachedContentTokenCount":5,"totalTokenCount":17},"text":"PRIVATE_CANARY","id":"PRIVATE_CANARY"}
            """));
        assertEquals("KAPTAL_AI_USAGE provider=gemini status=reported input_tokens=10 output_tokens=3 total_tokens=17",logs.list.getFirst().getFormattedMessage());
        assertNull(logs.list.getFirst().getThrowableProxy());
        assertFalse(logs.list.getFirst().getFormattedMessage().contains("PRIVATE_CANARY"));
    }
    @Test void reportedZerosAreDifferentFromMissingOrPartialUsage() throws Exception {
        AiTokenMetrics.groq(mapper.readTree("{\"usage\":{\"prompt_tokens\":0,\"completion_tokens\":0,\"total_tokens\":0}}"));
        assertTrue(logs.list.getFirst().getFormattedMessage().contains("status=reported input_tokens=0 output_tokens=0 total_tokens=0"));
        AiTokenMetrics.groq(null);AiTokenMetrics.groq(mapper.readTree("{\"usage\":{\"prompt_tokens\":12}}"));
        assertEquals(3,logs.list.size());
        for(int i=1;i<3;i++)assertEquals("KAPTAL_AI_USAGE provider=groq status=unavailable",logs.list.get(i).getFormattedMessage());
    }
    @ParameterizedTest @ValueSource(strings={"-1","1.5","\"PRIVATE_CANARY\"","null","1000000001","9223372036854775808","{}","[]"})
    void invalidProviderCountersNeverBecomeEstimatesOrLeakTheirValues(String value) throws Exception {
        var response=mapper.readTree("{\"usage\":{\"prompt_tokens\":"+value+",\"completion_tokens\":1,\"total_tokens\":20}}");
        assertDoesNotThrow(()->AiTokenMetrics.groq(response));
        assertEquals("KAPTAL_AI_USAGE provider=groq status=unavailable",logs.list.getFirst().getFormattedMessage());
    }
    @Test void inconsistentTotalsAreUnavailableInsteadOfInventingTheirReplacement() throws Exception {
        AiTokenMetrics.groq(mapper.readTree("{\"usage\":{\"prompt_tokens\":10,\"completion_tokens\":3,\"total_tokens\":12}}"));
        assertEquals("KAPTAL_AI_USAGE provider=groq status=unavailable",logs.list.getFirst().getFormattedMessage());
    }
    @ParameterizedTest @ValueSource(strings={"groq","gemini"})
    void providerHttpResponsesKeepTheirTextAndOnlyExposeWhitelistedCounts(String provider) {
        var builder=RestClient.builder();var server=MockRestServiceServer.bindTo(builder).build();
        var policy=mock(AiUsagePolicy.class);when(policy.enabled(anyString(),anyString())).thenReturn(true);
        var properties=new AiProperties("groq","gemini-3.5-flash-lite",null,
            new AiProperties.Gemini("synthetic","https://generativelanguage.googleapis.com/v1beta"),
            new AiProperties.Groq("synthetic","https://api.groq.com/openai/v1","openai/gpt-oss-20b"));
        String body=provider.equals("groq")
            ? "{\"choices\":[{\"message\":{\"content\":\"PRIVATE_REPLY\"}}],\"usage\":{\"prompt_tokens\":11,\"completion_tokens\":7,\"total_tokens\":18},\"id\":\"PRIVATE_ID\"}"
            : "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"PRIVATE_REPLY\"}]}}],\"usageMetadata\":{\"promptTokenCount\":11,\"candidatesTokenCount\":7,\"totalTokenCount\":18},\"id\":\"PRIVATE_ID\"}";
        String url=provider.equals("groq")?"https://api.groq.com/openai/v1/chat/completions"
            :"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent";
        server.expect(requestTo(url)).andRespond(withSuccess(body,MediaType.APPLICATION_JSON));
        AiProvider client=provider.equals("groq")?new GroqAiProvider(builder,properties,policy):new GeminiAiProvider(builder,properties,policy);
        assertEquals("PRIVATE_REPLY",client.generate("PRIVATE_PROMPT",50));
        assertEquals(1,logs.list.size());
        assertEquals("KAPTAL_AI_USAGE provider="+provider+" status=reported input_tokens=11 output_tokens=7 total_tokens=18",logs.list.getFirst().getFormattedMessage());
        assertFalse(logs.list.getFirst().getFormattedMessage().contains("PRIVATE"));server.verify();
    }
}
