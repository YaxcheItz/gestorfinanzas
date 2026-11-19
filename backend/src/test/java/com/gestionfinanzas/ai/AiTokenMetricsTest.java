package com.gestionfinanzas.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import ch.qos.logback.classic.*;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.LoggerFactory;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClient;
import org.springframework.test.web.client.MockRestServiceServer;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(OutputCaptureExtension.class)
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

    @ParameterizedTest @ValueSource(strings={"groq","gemini"})
    void unavailableOnlyCountsResponsesThatReachUsageParsing(String provider) {
        var properties=new AiProperties("groq","gemini-3.5-flash-lite",null,
            new AiProperties.Gemini("synthetic","https://generativelanguage.googleapis.com/v1beta"),
            new AiProperties.Groq("synthetic","https://api.groq.com/openai/v1","openai/gpt-oss-20b"));
        var policy=mock(AiUsagePolicy.class);when(policy.enabled(anyString(),anyString())).thenReturn(true);
        String url=provider.equals("groq")?"https://api.groq.com/openai/v1/chat/completions"
            :"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent";
        for (int scenario=0;scenario<4;scenario++) {
            var builder=RestClient.builder();var server=MockRestServiceServer.bindTo(builder).build();
            if (scenario==0) server.expect(requestTo(url)).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
            else if (scenario==1) server.expect(requestTo(url)).andRespond(withException(new java.io.IOException("synthetic failure")));
            else if (scenario==2) server.expect(requestTo(url)).andRespond(withSuccess("{",MediaType.APPLICATION_JSON));
            else {
                String body=provider.equals("groq")?"{\"choices\":[{\"message\":{\"content\":\"ok\"}}]}":
                    "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"ok\"}]}}]}";
                server.expect(requestTo(url)).andRespond(withSuccess(body,MediaType.APPLICATION_JSON));
            }
            AiProvider client=provider.equals("groq")?new GroqAiProvider(builder,properties,policy):new GeminiAiProvider(builder,properties,policy);
            if (scenario<3) {
                if (scenario<2) assertThrows(AiProviderException.class,()->client.generate("synthetic",50));
                else assertThrows(org.springframework.web.client.RestClientException.class,()->client.generate("synthetic",50));
                assertTrue(logs.list.isEmpty(),"El error anterior al parseo no emite uso");
            } else {
                assertEquals("ok",client.generate("synthetic",50));
                assertEquals("KAPTAL_AI_USAGE provider="+provider+" status=unavailable",logs.list.getFirst().getFormattedMessage());
            }
            server.verify();
        }
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void groqTextAndCaptureReportOnlyQuotaCeilings(boolean captura, CapturedOutput logs) {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.groq.com/openai/v1/chat/completions"))
                .andRespond(withSuccess("{\"choices\":[{\"message\":{\"content\":\"PRIVATE_REPLY\"}}]}",
                        MediaType.APPLICATION_JSON)
                        .header("x-ratelimit-limit-requests", "1000")
                        .header("x-ratelimit-limit-tokens", "8000")
                        .header("x-ratelimit-remaining-tokens", "7111")
                        .header("x-request-id", "PRIVATE_HEADER"));
        var groq = groqForLimits(builder);

        String text = captura ? groq.generateCaptura("PRIVATE_PROMPT", 50) : groq.generate("PRIVATE_PROMPT", 50);
        assertEquals("PRIVATE_REPLY", text);
        assertEquals(java.util.List.of(
                "KAPTAL_AI_GROQ_LIMIT dimension=requests_per_day value=1000",
                "KAPTAL_AI_GROQ_LIMIT dimension=tokens_per_minute value=8000"), quotaRecords(logs));
        assertFalse(logs.getAll().contains("PRIVATE_"));
        assertFalse(logs.getAll().contains("7111"));
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {"PRIVATE_HEADER", "-1", "10.5", "9999999999999999", "10, 20"})
    void groq429PreservesTheErrorAndSkipsAnInvalidQuota(String invalidTokens, CapturedOutput logs) {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.groq.com/openai/v1/chat/completions"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS)
                        .header("x-ratelimit-limit-requests", "0")
                        .header("x-ratelimit-limit-tokens", invalidTokens));
        var groq = groqForLimits(builder);

        var error = assertThrows(AiProviderException.class, () -> groq.generate("PRIVATE_PROMPT", 50));
        assertTrue(error.getMessage().contains("Groq alcanzó el límite"));
        assertEquals(java.util.List.of("KAPTAL_AI_GROQ_LIMIT dimension=requests_per_day value=0"), quotaRecords(logs));
        assertFalse(logs.getAll().contains("PRIVATE_"));
        server.verify();
    }

    private GroqAiProvider groqForLimits(RestClient.Builder builder) {
        var policy = mock(AiUsagePolicy.class);
        when(policy.enabled(anyString(), anyString())).thenReturn(true);
        var properties = new AiProperties("groq", null, null, null,
                new AiProperties.Groq("synthetic", "https://api.groq.com/openai/v1", "openai/gpt-oss-20b"));
        return new GroqAiProvider(builder, properties, policy);
    }

    private java.util.List<String> quotaRecords(CapturedOutput logs) {
        String marker = "KAPTAL_AI_GROQ_LIMIT";
        return logs.getAll().lines().filter(line -> line.contains(marker))
                .map(line -> line.substring(line.indexOf(marker))).toList();
    }
}
