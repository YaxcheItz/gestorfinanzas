package com.gestionfinanzas.ai;

import com.gestionfinanzas.dto.request.AiChatRequest;
import com.gestionfinanzas.dto.request.AiQuickCaptureRequest;
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
    private final ClasificadorCapturaGroq clasificador = mock(ClasificadorCapturaGroq.class);
    private final AiAssistantService service = new AiAssistantService(provider, actionService, clasificador);

    @Test void clasificaSoloCategoriaFaltanteSinEnviarHistorialAlProveedorGeneral() {
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        var datos = mapper.createObjectNode().put("tipo", "GASTO").put("descripcion", "empanadas").putNull("categoriaId");
        var original = new AiActionService.ActionProposal("p1", "CREATE_TRANSACTION", "Gasto", datos, 0L);
        var actualizado = new AiActionService.ActionProposal("p1", "CREATE_TRANSACTION", "Gasto", datos.deepCopy().put("categoriaId", 1), 1L);
        when(actionService.interpretarCapturaRapida(7L, "Gaste 50 en empanadas"))
                .thenReturn(new AiActionService.AiActionResult("Preparado", original));
        when(actionService.categoriasCaptura(7L)).thenReturn(List.of());
        when(actionService.permitirClasificacionCaptura(7L)).thenReturn(true);
        when(actionService.conceptoParaClasificar(7L, "empanadas")).thenReturn("empanadas");
        when(clasificador.clasificar(eq("empanadas"), eq(com.gestionfinanzas.model.enums.TipoTransaccion.GASTO), eq(List.of())))
                .thenReturn(java.util.Optional.of(new ClasificadorCapturaGroq.Clasificacion(1, java.util.Set.of())));
        when(actionService.asignarCategoriaCaptura(7L, original, 1)).thenReturn(actualizado);
        var respuesta = service.quickCapture(7L, new AiQuickCaptureRequest("Gaste 50 en empanadas", false, false));
        assertEquals("GROQ_CATEGORIA", respuesta.engine());
        assertEquals(1, respuesta.action().data().path("categoriaId").asInt());
        verify(provider, never()).generate(anyString(), anyInt());
    }

    @Test void limiteDeIaConservaLaPropuestaLocalSinConsultarGroq() {
        var datos = new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode()
                .put("tipo", "GASTO").put("descripcion", "empanadas").putNull("categoriaId");
        var propuesta = new AiActionService.ActionProposal("p2", "CREATE_TRANSACTION", "Gasto", datos, 0L);
        when(actionService.interpretarCapturaRapida(7L, "Gaste 50 en empanadas"))
                .thenReturn(new AiActionService.AiActionResult("Preparado", propuesta));
        when(actionService.permitirClasificacionCaptura(7L)).thenReturn(false);
        var respuesta = service.quickCapture(7L, new AiQuickCaptureRequest("Gaste 50 en empanadas", false, false));
        assertEquals("REGLAS", respuesta.engine());
        assertEquals(propuesta, respuesta.action());
        verify(clasificador, never()).clasificar(anyString(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyList());
        verify(actionService, never()).asignarCategoriaCaptura(org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyLong());
    }

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
        when(provider.generate(contains("KAPTAL_IA_OK"), eq(48)))
                .thenReturn("KAPTAL_IA_OK");
        when(provider.id()).thenReturn("gemini");
        when(provider.model()).thenReturn("gemini-2.5-flash");

        var result = service.verifyConnection();

        assertEquals("gemini", result.provider());
        assertEquals("gemini-2.5-flash", result.model());
        assertTrue(result.connected());
        verify(provider).generate(contains("KAPTAL_IA_OK"), eq(48));
    }

    @Test
    void verifyConnectionRechazaUnaRespuestaDistinta() {
        when(provider.isConfigured()).thenReturn(true);
        when(provider.generate(contains("KAPTAL_IA_OK"), eq(48)))
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
        ), true);

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
        ), true);

        assertThrows(IllegalArgumentException.class, () -> service.chat(7L, request));
        verify(actionService, never()).interpret(eq(7L), anyString());
    }

    @Test
    void quickCaptureSinReglaLocalSolicitaConsentimientoAntesDeUsarProveedor() {
        when(actionService.interpretarCapturaRapida(7L, "gasté 250 en comida")).thenReturn(null);

        assertThrows(IllegalArgumentException.class, () -> service.quickCapture(7L,
                new AiQuickCaptureRequest("gasté 250 en comida", false, false)));

        verify(provider, never()).generate(anyString(), anyInt());
    }
    @Test
    void reglasFuncionanSinConsentimientoNiProveedorConfigurado() {
        when(actionService.interpretarCapturaRapida(7L, "Reporte de hoy"))
                .thenReturn(new AiActionService.AiActionResult("Sin movimientos", null));
        var respuesta=service.quickCapture(7L,new AiQuickCaptureRequest("Reporte de hoy",false,false));
        assertEquals("REGLAS",respuesta.engine());
        verify(provider,never()).generate(anyString(),anyInt());
        verify(provider,never()).isConfigured();
    }
    @Test
    void seguimientoCombinaContextoSinEnviarDatosAProveedor() {
        when(actionService.interpretarCapturaRapida(7L, "Gasto en tacos 80"))
                .thenReturn(new AiActionService.AiActionResult("Revisa", null));
        service.quickCapture(7L,new AiQuickCaptureRequest("80",false,false,"Gasto en tacos"));
        verify(actionService).interpretarCapturaRapida(7L,"Gasto en tacos 80");
        verify(provider,never()).generate(anyString(),anyInt());
    }
    @Test
    void etiquetaExplicitaNoSeMezclaConElConcepto() {
        var propuesta = new AiActionService.ActionProposal("prueba", "CREATE_TRANSACTION", "Gasto", null);
        when(actionService.interpretarCapturaRapida(7L, "Gaste 50 en tacos"))
                .thenReturn(new AiActionService.AiActionResult("Revisa", propuesta));
        when(actionService.pendientes(7L)).thenReturn(List.of(propuesta));
        service.quickCapture(7L,new AiQuickCaptureRequest("Gaste 50 en tacos con etiqueta viaje",false,false));
        verify(actionService).interpretarCapturaRapida(7L,"Gaste 50 en tacos");
        verify(actionService).marcarContextoCaptura(7L, propuesta, null, java.util.Set.of("viaje"));
        verify(provider,never()).generate(anyString(),anyInt());
    }
    @Test
    void capturaSoloPasaHistorialAlProveedorConConsentimiento() {
        var historial=List.of(new AiChatRequest.Message(AiChatRequest.Role.USER,"Hola"),new AiChatRequest.Message(AiChatRequest.Role.ASSISTANT,"Hola, dime"));
        assertThrows(IllegalArgumentException.class,()->service.quickCapture(7L,new AiQuickCaptureRequest("Cuentame mas",false,false,null,null,historial)));
        verify(provider,never()).isConfigured();
        when(provider.isConfigured()).thenReturn(true);
        when(actionService.interpret(eq(7L),contains("Usuario: Hola"))).thenReturn(new AiActionService.AiActionResult("Respuesta",null));
        var resultado=service.quickCapture(7L,new AiQuickCaptureRequest("Cuentame mas",true,false,null,null,historial));
        assertEquals("Respuesta",resultado.answer());
        verify(actionService).interpret(eq(7L),contains("Asistente: Hola, dime"));
    }
    @Test
    void chatYVozDevuelvenAccionesDelAsistenteSinEjecutarlas() {
        when(provider.isConfigured()).thenReturn(true);
        var accion=new AiActionService.ActionProposal("a1","CREATE_ACCOUNT","Crear cuenta",null);
        when(actionService.interpret(eq(7L),anyString())).thenReturn(new AiActionService.AiActionResult("Revisa",accion));
        assertEquals("CREATE_ACCOUNT",service.quickCapture(7L,new AiQuickCaptureRequest("Crea una cuenta",true,false)).action().type());
        when(actionService.pendientes(7L)).thenReturn(List.of(accion));
        assertEquals("CREATE_ACCOUNT",service.quickCapture(7L,new AiQuickCaptureRequest("Crea una cuenta",true,true)).action().type());
        verify(actionService,never()).confirm(eq(7L),anyString());
    }
}
