package com.gestionfinanzas.ai;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AiProviderMetricsTest {
    private final OpenAiProvider openai = mock(OpenAiProvider.class);
    private final Logger logger = (Logger) LoggerFactory.getLogger(AiProviderRouter.class);
    private final ListAppender<ILoggingEvent> logs = new ListAppender<>();
    private Level originalLevel;
    private AiProviderRouter router;

    @BeforeEach void setup() {
        when(openai.id()).thenReturn("openai");
        when(openai.isConfigured()).thenReturn(true);
        router = router();
        originalLevel = logger.getLevel(); logger.setLevel(Level.INFO);
        logs.start(); logger.addAppender(logs);
    }

    private AiProviderRouter router() {
        var gemini = mock(GeminiAiProvider.class); when(gemini.id()).thenReturn("gemini");
        var groq = mock(GroqAiProvider.class); when(groq.id()).thenReturn("groq");
        return new AiProviderRouter(new AiProperties("openai", null, null, null),
                openai, gemini, groq);
    }

    @AfterEach void cleanup() {
        logger.detachAppender(logs); logs.stop(); logger.setLevel(originalLevel);
    }

    @Test void recordsOnlyProviderOutcomeAndDurationWithoutChangingResponse() {
        when(openai.generate(anyString(), anyInt())).thenReturn("synthetic-private-response");
        assertEquals("synthetic-private-response", router.generate("synthetic-private-prompt", 50));
        assertEquals(1, logs.list.size());
        assertTrue(logs.list.getFirst().getFormattedMessage().matches(
                "KAPTAL_AI_GENERATION provider=openai outcome=success elapsed_ms=[0-9]+"));
        assertNull(logs.list.getFirst().getThrowableProxy());
    }

    @Test void providerFailuresAreSanitizedAndReleaseTheConcurrencyPermit() {
        var failure = new AiProviderException("synthetic-sensitive-error");
        when(openai.generate(anyString(), anyInt())).thenThrow(failure);
        for (int i = 0; i < 8; i++) assertSame(failure,
                assertThrows(AiProviderException.class, () -> router.generate("private-input", 50)));
        assertEquals(8, logs.list.size());
        for (var log : logs.list) {
            assertTrue(log.getFormattedMessage().contains("outcome=provider_error"));
            assertFalse(log.getFormattedMessage().contains("sensitive"));
            assertNull(log.getThrowableProxy());
        }
    }

    @Test void invalidRequestsDoNotCallTheProvider() {
        assertThrows(AiProviderException.class, () -> router.generate(null, 50));
        assertThrows(AiProviderException.class, () -> router.generate("x".repeat(60001), 50));
        assertThrows(AiProviderException.class, () -> router.generate("private-input", 0));
        assertThrows(AiProviderException.class, () -> router.generate("private-input", 1201));
        verify(openai, never()).generate(any(), anyInt());
        assertEquals(4, logs.list.size());
        assertTrue(logs.list.stream().allMatch(e -> e.getFormattedMessage().contains("outcome=invalid_request")));
    }

    @Test void invalidResponsesAreDistinguishedFromProviderFailures() {
        when(openai.generate(anyString(), anyInt())).thenReturn(null, "x".repeat(40001));
        assertThrows(AiProviderException.class, () -> router.generate("private-input", 50));
        assertThrows(AiProviderException.class, () -> router.generate("private-input", 50));
        assertEquals(2, logs.list.size());
        assertTrue(logs.list.stream().allMatch(e -> e.getFormattedMessage().contains("outcome=invalid_response")));
    }

    @Test void unknownProviderNamesCannotInjectDataIntoTheRecord() {
        when(openai.id()).thenReturn("private-provider\ninjected-record");
        router = router();
        when(openai.generate(anyString(), anyInt())).thenReturn("ok");
        assertEquals("ok", router.generate("private-input", 50));
        assertEquals(1, logs.list.size());
        assertTrue(logs.list.getFirst().getFormattedMessage().matches(
                "KAPTAL_AI_GENERATION provider=unknown outcome=success elapsed_ms=[0-9]+"));
    }

    @Test void eachConfiguredProviderKeepsItsIdentityAndFixedMetricLabel() {
        var gemini = mock(GeminiAiProvider.class); var groq = mock(GroqAiProvider.class);
        var providers = java.util.List.<AiProvider>of(openai, gemini, groq);
        var names = java.util.List.of("openai", "gemini", "groq");
        for (int i = 0; i < providers.size(); i++) {
            var provider = providers.get(i);
            when(provider.id()).thenReturn(names.get(i));
            when(provider.model()).thenReturn("synthetic-private-model");
            when(provider.isConfigured()).thenReturn(true);
            when(provider.generate(anyString(), anyInt())).thenReturn("ok");
        }
        for (var name : names) {
            var selected = new AiProviderRouter(new AiProperties(name, null, null, null), openai, gemini, groq);
            assertEquals(name, selected.id()); assertTrue(selected.isConfigured());
            assertEquals("synthetic-private-model", selected.model());
            assertEquals("ok", selected.generate("private-input", 50));
            assertTrue(logs.list.getLast().getFormattedMessage().matches(
                    "KAPTAL_AI_GENERATION provider=" + name + " outcome=success elapsed_ms=[0-9]+"));
        }
        assertEquals(3, logs.list.size());
    }

    @Test void saturationIsRecordedWithoutCallingAProviderForTheRejectedRequest() throws Exception {
        assertThrows(AiProviderException.class, () -> router.generate(null, 50));
        var entered = new CountDownLatch(4); var release = new CountDownLatch(1);
        when(openai.generate(anyString(), anyInt())).thenAnswer(call -> {
            entered.countDown();
            if (!release.await(5, TimeUnit.SECONDS)) throw new AssertionError("Fixture timeout");
            return "ok";
        });
        try (var workers = Executors.newFixedThreadPool(4)) {
            var futures = java.util.stream.IntStream.range(0, 4)
                    .mapToObj(i -> workers.submit(() -> router.generate("private-input", 50))).toList();
            try {
                assertTrue(entered.await(5, TimeUnit.SECONDS));
                assertThrows(AiProviderException.class, () -> router.generate("private-input", 50));
                assertThrows(AiProviderException.class, () -> router.generate("private-input", 50));
            } finally { release.countDown(); }
            for (var future : futures) assertEquals("ok", future.get(5, TimeUnit.SECONDS));
        }
        verify(openai, times(4)).generate(anyString(), anyInt());
        assertEquals(7, logs.list.size());
        assertEquals(2, logs.list.stream().filter(e -> e.getFormattedMessage().contains("outcome=busy")).count());
    }
}
