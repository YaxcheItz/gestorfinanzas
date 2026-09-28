package com.gestionfinanzas.ai;

import com.gestionfinanzas.dto.request.AiChatRequest;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiAssistantServiceTest {

    private final AiProvider provider = mock(AiProvider.class);
    private final AiActionService actionService = mock(AiActionService.class);
    private final AiAssistantService service = new AiAssistantService(provider, actionService);

    @Test
    void statusExponeSoloProveedorModeloYConfiguracion() {
        when(provider.id()).thenReturn("gemini");
        when(provider.model()).thenReturn("gemini-2.5-flash");
        when(provider.isConfigured()).thenReturn(true);

        var status = service.status();

        assertEquals("gemini", status.provider());
        assertEquals("gemini-2.5-flash", status.model());
        assertTrue(status.configured());
    }

    @Test
    void verifyConnectionRechazaConfiguracionAusenteSinLlamarProveedor() {
        when(provider.isConfigured()).thenReturn(false);

        assertThrows(AiConfigurationException.class, service::verifyConnection);
        verify(provider, never()).generate(anyString(), anyInt());
    }

    @Test
    void verifyConnectionSoloAceptaLaRespuestaEsperada() {
        when(provider.isConfigured()).thenReturn(true);
        when(provider.generate("Responde exactamente con este texto y nada más: KAPTAL_IA_OK", 24))
                .thenReturn("KAPTAL_IA_OK");
        when(provider.id()).thenReturn("gemini");
        when(provider.model()).thenReturn("gemini-2.5-flash");

        var result = service.verifyConnection();

        assertEquals("gemini", result.provider());
        assertEquals("gemini-2.5-flash", result.model());
        assertTrue(result.connected());
    }

    @Test
    void verifyConnectionRechazaUnaRespuestaDistinta() {
        when(provider.isConfigured()).thenReturn(true);
        when(provider.generate("Responde exactamente con este texto y nada más: KAPTAL_IA_OK", 24))
                .thenReturn("Respuesta diferente");

        assertThrows(AiProviderException.class, service::verifyConnection);
    }

    @Test
    void chatPasaLaConversacionYAccionPropuestaAlServicioDeAcciones() {
        when(provider.isConfigured()).thenReturn(true);
        var proposal = new AiActionService.ActionProposal(
                "id", "CREATE_TRANSACTION", "Registrar gasto", null
        );
        when(actionService.interpret(eq(7L), contains("Usuario: ¿Cuánto tengo?")))
                .thenReturn(new AiActionService.AiActionResult("¿En qué cuenta?", proposal));
        AiChatRequest request = new AiChatRequest(List.of(
                new AiChatRequest.Message(AiChatRequest.Role.USER, "¿Cuánto tengo?")
        ));

        var response = service.chat(7L, request);

        assertEquals("¿En qué cuenta?", response.answer());
        assertEquals(proposal, response.action());
        verify(actionService).interpret(eq(7L), contains("Usuario: ¿Cuánto tengo?"));
    }

    @Test
    void chatRechazaHistorialConRolesFueraDeOrden() {
        when(provider.isConfigured()).thenReturn(true);
        AiChatRequest request = new AiChatRequest(List.of(
                new AiChatRequest.Message(AiChatRequest.Role.USER, "Hola"),
                new AiChatRequest.Message(AiChatRequest.Role.ASSISTANT, "Hola"),
                new AiChatRequest.Message(AiChatRequest.Role.ASSISTANT, "Otra respuesta"),
                new AiChatRequest.Message(AiChatRequest.Role.USER, "¿Cuánto tengo?")
        ));

        assertThrows(IllegalArgumentException.class, () -> service.chat(7L, request));
        verify(actionService, never()).interpret(eq(7L), anyString());
    }
}
