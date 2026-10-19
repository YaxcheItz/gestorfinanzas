package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.gestionfinanzas.ai.AiActionService;
import com.gestionfinanzas.ai.AiProvider;
import com.gestionfinanzas.controller.WhatsappConsultaController.Respuesta;
import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.dto.response.CategoriaResponse;
import com.gestionfinanzas.dto.response.CuentaResponse;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.security.LimiteAbuso;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WhatsappIaFallbackTest {

    private CuentaService cuentas;
    private CategoriaService categorias;
    private TransaccionService movimientos;
    private AiActionService acciones;
    private ObjectMapper mapper;
    private LimiteAbuso limite;
    private AiProvider aiProvider;
    private Validator validator;
    private WhatsappInterpretacionService service;

    private final Long usuarioId = 42L;
    private List<CuentaResponse> catalogo;
    private CuentaResponse cuentaNu;
    private CuentaResponse cuentaBbva;
    private CategoriaResponse catComida;

    private CuentaResponse crearCuenta(Long id, String nombre, String moneda, BigDecimal saldo) {
        return new CuentaResponse(
                id, nombre, TipoCuenta.DEBITO, "Banco",
                null, null, null, null, null,
                saldo, moneda, "Desc", true, null, null
        );
    }

    private CategoriaResponse crearCategoria(Long id, String nombre) {
        return new CategoriaResponse(
                id, nombre, TipoTransaccion.GASTO, "utensils", "#FF5733", false, true
        );
    }

    @BeforeEach
    void setUp() {
        cuentas = mock(CuentaService.class);
        categorias = mock(CategoriaService.class);
        movimientos = mock(TransaccionService.class);
        acciones = mock(AiActionService.class);
        mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        limite = mock(LimiteAbuso.class);
        aiProvider = mock(AiProvider.class);
        validator = Validation.buildDefaultValidatorFactory().getValidator();

        service = new WhatsappInterpretacionService(
                cuentas, categorias, movimientos, acciones, mapper, limite, aiProvider, validator
        );

        cuentaNu = crearCuenta(1L, "Nu", "MXN", new BigDecimal("1500.00"));
        cuentaBbva = crearCuenta(2L, "BBVA", "USD", new BigDecimal("300.00"));
        catComida = crearCategoria(10L, "Comida");
        catalogo = List.of(cuentaNu, cuentaBbva);

        when(cuentas.listarCuentas(usuarioId, true)).thenReturn(catalogo);
        when(categorias.listarCategorias(usuarioId)).thenReturn(List.of(catComida));
        when(movimientos.listarRecientes(usuarioId)).thenReturn(List.of());
    }

    @Test
    @DisplayName("Cuando la IA no está configurada, retorna aclaración segura por defecto")
    void cuandoIaNoEstaConfigurada_retornaAclaracionSegura() {
        when(aiProvider.isConfigured()).thenReturn(false);

        ApiResponse<Respuesta> response = service.interpretarConIaFallback(usuarioId, "movimiento complejo no estándar", catalogo);

        assertNotNull(response);
        assertEquals("Necesito más detalle", response.message());
        Respuesta data = response.data();
        assertEquals("ACLARACION", data.tipo());
        assertTrue(data.respuesta().contains("No pude resolverlo con seguridad"));
        verify(aiProvider, never()).generate(anyString(), anyInt());
    }

    @Test
    @DisplayName("Cuando la IA está configurada y genera propuesta válida con cuenta y categoría")
    void cuandoIaConfigurada_generaPropuestaCorrecta() {
        when(aiProvider.isConfigured()).thenReturn(true);
        String aiJson = """
            {
              "entendido": true,
              "tipo": "GASTO",
              "monto": 350.50,
              "descripcion": "cena con amigos",
              "fecha": "2026-10-18",
              "cuentaId": 1,
              "cuentaDestinoId": null,
              "categoriaId": 10,
              "respuesta": "Gasto de 350.50 MXN en cena con amigos con Nu",
              "duda": null
            }
            """;
        when(aiProvider.generate(anyString(), anyInt())).thenReturn(aiJson);

        ApiResponse<Respuesta> response = service.interpretarConIaFallback(usuarioId, "cena amigos 350.50 en Nu", catalogo);

        assertNotNull(response);
        assertEquals("Movimiento interpretado sin guardar", response.message());
        Respuesta data = response.data();
        assertEquals("PROPUESTA", data.tipo());
        assertEquals("MXN", data.moneda());
        assertNotNull(data.propuesta());
        assertEquals(1L, data.propuesta().cuentaId());
        assertEquals(10L, data.propuesta().categoriaId());
        assertEquals(TipoTransaccion.GASTO, data.propuesta().tipo());
        assertEquals(new BigDecimal("350.50"), data.propuesta().monto());
        assertEquals(LocalDate.parse("2026-10-18"), data.propuesta().fecha());
        assertEquals("cena con amigos", data.propuesta().descripcion());

        verify(limite).comprobar(eq("ia:42"), eq(15), any());
    }

    @Test
    @DisplayName("Cuando la IA devuelve markdown envolviendo el JSON, se extrae y procesa correctamente")
    void cuandoIaDevuelveMarkdown_seLimpiaYProcesa() {
        when(aiProvider.isConfigured()).thenReturn(true);
        String aiJson = """
            ```json
            {
              "entendido": true,
              "tipo": "GASTO",
              "monto": 120.00,
              "descripcion": "farmacia",
              "fecha": "2026-10-19",
              "cuentaId": 1,
              "cuentaDestinoId": null,
              "categoriaId": null,
              "respuesta": "Gasto de 120 MXN en farmacia con Nu",
              "duda": null
            }
            ```
            """;
        when(aiProvider.generate(anyString(), anyInt())).thenReturn(aiJson);

        ApiResponse<Respuesta> response = service.interpretarConIaFallback(usuarioId, "medicina 120 pesos", catalogo);

        assertNotNull(response);
        assertEquals("PROPUESTA", response.data().tipo());
        assertEquals(new BigDecimal("120.00"), response.data().propuesta().monto());
    }

    @Test
    @DisplayName("Cuando la IA detecta ambigüedad o falta de cuenta, solicita aclaración con sugerencias")
    void cuandoIaNoTieneCuenta_solicitaAclaracionConSugerencias() {
        when(aiProvider.isConfigured()).thenReturn(true);
        String aiJson = """
            {
              "entendido": true,
              "tipo": "GASTO",
              "monto": 45.00,
              "descripcion": "café",
              "fecha": "2026-10-19",
              "cuentaId": null,
              "cuentaDestinoId": null,
              "categoriaId": null,
              "respuesta": null,
              "duda": null
            }
            """;
        when(aiProvider.generate(anyString(), anyInt())).thenReturn(aiJson);

        ApiResponse<Respuesta> response = service.interpretarConIaFallback(usuarioId, "cafecito 45", catalogo);

        assertNotNull(response);
        Respuesta data = response.data();
        assertEquals("ACLARACION", data.tipo());
        assertTrue(data.respuesta().contains("¿Desde qué cuenta registramos este gasto de $45.00?"));
        assertTrue(data.sugerencias().contains("Nu"));
        assertTrue(data.sugerencias().contains("BBVA"));
        assertNotNull(data.contexto());
        assertTrue(data.contexto().contains("gasto 45.00"));
    }

    @Test
    @DisplayName("Si la IA intenta asignar una categoría inexistente o ajena, se filtra a null")
    void siCategoriaNoExiste_seFiltraANull() {
        when(aiProvider.isConfigured()).thenReturn(true);
        String aiJson = """
            {
              "entendido": true,
              "tipo": "GASTO",
              "monto": 80.00,
              "descripcion": "libro",
              "fecha": "2026-10-19",
              "cuentaId": 1,
              "cuentaDestinoId": null,
              "categoriaId": 99999,
              "respuesta": "Gasto de 80 en libro",
              "duda": null
            }
            """;
        when(aiProvider.generate(anyString(), anyInt())).thenReturn(aiJson);

        ApiResponse<Respuesta> response = service.interpretarConIaFallback(usuarioId, "libro 80 con Nu", catalogo);

        assertEquals("PROPUESTA", response.data().tipo());
        assertNull(response.data().propuesta().categoriaId(), "La categoría inválida debe filtrarse a null");
    }

    @Test
    @DisplayName("Si la IA marca entendido=false con duda, retorna la aclaración formulada por IA")
    void cuandoIaDevuelveEntendidoFalse_retornaDudaComoAclaracion() {
        when(aiProvider.isConfigured()).thenReturn(true);
        String aiJson = """
            {
              "entendido": false,
              "tipo": "GASTO",
              "monto": null,
              "descripcion": null,
              "fecha": null,
              "cuentaId": null,
              "cuentaDestinoId": null,
              "categoriaId": null,
              "respuesta": null,
              "duda": "¿Podrías indicarme el monto exacto del gasto?"
            }
            """;
        when(aiProvider.generate(anyString(), anyInt())).thenReturn(aiJson);

        ApiResponse<Respuesta> response = service.interpretarConIaFallback(usuarioId, "gasté dinero en el super", catalogo);

        Respuesta data = response.data();
        assertEquals("ACLARACION", data.tipo());
        assertEquals("¿Podrías indicarme el monto exacto del gasto?", data.respuesta());
    }

    @Test
    @DisplayName("Si la IA genera texto corrupto o no JSON, no revienta y responde aclaración segura")
    void cuandoIaGeneraTextoCorrupto_respondeAclaracionSegura() {
        when(aiProvider.isConfigured()).thenReturn(true);
        when(aiProvider.generate(anyString(), anyInt())).thenReturn("Lo siento, como modelo de lenguaje no puedo...");

        ApiResponse<Respuesta> response = service.interpretarConIaFallback(usuarioId, "mensaje incomprensible", catalogo);

        Respuesta data = response.data();
        assertEquals("ACLARACION", data.tipo());
        assertTrue(data.respuesta().contains("No pude resolverlo con seguridad"));
    }

    @Test
    @DisplayName("Si el tipo es TRANSFERENCIA pero falta cuenta destino, pide aclaración de destino")
    void cuandoTransferenciaSinDestino_pideAclaracionDestino() {
        when(aiProvider.isConfigured()).thenReturn(true);
        String aiJson = """
            {
              "entendido": true,
              "tipo": "TRANSFERENCIA",
              "monto": 500.00,
              "descripcion": "traspaso",
              "fecha": "2026-10-19",
              "cuentaId": 1,
              "cuentaDestinoId": null,
              "categoriaId": null,
              "respuesta": null,
              "duda": null
            }
            """;
        when(aiProvider.generate(anyString(), anyInt())).thenReturn(aiJson);

        ApiResponse<Respuesta> response = service.interpretarConIaFallback(usuarioId, "mandé 500 pesos desde mi Nu", catalogo);

        Respuesta data = response.data();
        assertEquals("ACLARACION", data.tipo());
        assertTrue(data.respuesta().contains("¿A qué cuenta transferiste"));
        assertTrue(data.sugerencias().contains("BBVA"));
        assertFalse(data.sugerencias().contains("Nu"), "No debe sugerir la misma cuenta origen");
    }

    @Test
    @DisplayName("Reglas primero: Si MotorChatReglas resuelve, nunca invoca a la IA")
    void reglasPrimero_noInvocaIa() {
        ApiResponse<Respuesta> response = service.interpretar(usuarioId, "Gasté 180 en tacos con Nu");

        assertNotNull(response);
        assertEquals("PROPUESTA", response.data().tipo());
        verify(aiProvider, never()).generate(anyString(), anyInt());
    }

    @Test
    @DisplayName("IA de rescate: Cuando reglas no pueden resolver (ej. múltiples montos), se invoca a la IA")
    void rescateIa_cuandoReglasNoResuelven() {
        when(aiProvider.isConfigured()).thenReturn(true);
        String aiJson = """
            {
              "entendido": true,
              "tipo": "GASTO",
              "monto": 250.00,
              "descripcion": "cena y propina",
              "fecha": "2026-10-19",
              "cuentaId": 1,
              "cuentaDestinoId": null,
              "categoriaId": 10,
              "respuesta": "Gasto de 250 MXN en cena y propina con Nu",
              "duda": null
            }
            """;
        when(aiProvider.generate(anyString(), anyInt())).thenReturn(aiJson);

        // Múltiples montos: MotorChatReglas devuelve null
        ApiResponse<Respuesta> response = service.interpretar(usuarioId, "Gasté 200 en cena y 50 de propina con Nu");

        assertNotNull(response);
        assertEquals("PROPUESTA", response.data().tipo());
        assertEquals(new BigDecimal("250.00"), response.data().propuesta().monto());
        verify(aiProvider, times(1)).generate(anyString(), anyInt());
    }
}
