package com.gestionfinanzas.ai;

import org.junit.jupiter.api.Test;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LimiteIaTest {
    @Test void cuotaPorUsuarioSeReiniciaAlCambiarVentana() {
        Clock clock=mock(Clock.class);when(clock.millis()).thenReturn(1000L);
        var limite=new LimiteIa(clock);for(int i=0;i<10;i++)limite.consumir(1L);
        var error=assertThrows(org.springframework.web.server.ResponseStatusException.class,()->limite.consumir(1L));
        assertEquals(429,error.getStatusCode().value());assertDoesNotThrow(()->limite.consumir(2L));
        when(clock.millis()).thenReturn(61000L);assertDoesNotThrow(()->limite.consumir(1L));
    }
    @Test void routerRechazaEntradaSalidaGrandesYLiberaPermiso() {
        var openai=mock(OpenAiProvider.class);var gemini=mock(GeminiAiProvider.class);var groq=mock(GroqAiProvider.class);
        when(openai.id()).thenReturn("openai");when(openai.isConfigured()).thenReturn(true);
        var router=new AiProviderRouter(new AiProperties("openai",null,null,null),openai,gemini,groq);
        assertThrows(AiProviderException.class,()->router.generate("x".repeat(60001),48));
        verify(openai,never()).generate(anyString(),anyInt());
        when(openai.generate("Consulta",48)).thenReturn("x".repeat(40001));
        for(int i=0;i<5;i++)assertThrows(AiProviderException.class,()->router.generate("Consulta",48));
        when(openai.generate("Consulta",48)).thenReturn("Respuesta");assertEquals("Respuesta",router.generate("Consulta",48));
    }
}
