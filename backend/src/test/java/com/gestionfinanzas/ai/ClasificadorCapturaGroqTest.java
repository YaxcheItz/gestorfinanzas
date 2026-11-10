package com.gestionfinanzas.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestionfinanzas.dto.response.CategoriaResponse;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ClasificadorCapturaGroqTest {
    private final GroqAiProvider groq = mock(GroqAiProvider.class);
    private final ClasificadorCapturaGroq clasificador = new ClasificadorCapturaGroq(groq, new ObjectMapper());
    private final List<CategoriaResponse> categorias = List.of(
            new CategoriaResponse(1L, "Comida", TipoTransaccion.GASTO, null, null, false, true),
            new CategoriaResponse(2L, "Salario", TipoTransaccion.INGRESO, null, null, false, true));

    @Test void aceptaCategoriaCompatibleYEtiquetasValidas() {
        when(groq.isConfigured()).thenReturn(true);
        when(groq.generateCaptura(anyString(), anyInt())).thenReturn("{\"categoriaId\":1,\"etiquetas\":[\"comida\"]}");
        var resultado = clasificador.clasificar("empanadas", TipoTransaccion.GASTO, categorias).orElseThrow();
        assertEquals(1L, resultado.categoriaId());
        assertEquals(java.util.Set.of("comida"), resultado.etiquetas());
        verify(groq).generateCaptura(argThat(p -> p.contains("empanadas") && !p.contains("Salario")), eq(200));
    }

    @Test void rechazaCategoriaAjenaYSalidaInvalida() {
        when(groq.isConfigured()).thenReturn(true);
        when(groq.generateCaptura(anyString(), anyInt())).thenReturn("{\"categoriaId\":2,\"etiquetas\":[]}",
                "{\"categoriaId\":1,\"etiquetas\":[\"dos palabras\"]}", "no es json");
        for (int i=0; i<3; i++) assertTrue(clasificador.clasificar("empanadas", TipoTransaccion.GASTO, categorias).isEmpty());
    }

    @Test void noGuardaAlFallarProveedor() {
        when(groq.isConfigured()).thenReturn(true);
        when(groq.generateCaptura(anyString(), anyInt())).thenThrow(new AiProviderException("no disponible"));
        assertTrue(clasificador.clasificar("empanadas", TipoTransaccion.GASTO, categorias).isEmpty());
    }
    @Test void categoriasConElMismoNombreNoSeDecidenPorOrden() {
        when(groq.isConfigured()).thenReturn(true);
        when(groq.generateCaptura(anyString(), anyInt())).thenReturn("{\"categoriaId\":1,\"etiquetas\":[]}");
        var duplicadas = List.of(categorias.getFirst(),
                new CategoriaResponse(3L, "COMIDA", TipoTransaccion.GASTO, null, null, true, true));
        assertTrue(clasificador.clasificar("empanadas", TipoTransaccion.GASTO, duplicadas).isEmpty());
    }
    @Test void limitaSolicitudesConcurrentesSinBloquearLaQuinta() throws Exception {
        when(groq.isConfigured()).thenReturn(true);
        var iniciadas = new java.util.concurrent.CountDownLatch(4);
        var liberar = new java.util.concurrent.CountDownLatch(1);
        when(groq.generateCaptura(anyString(), anyInt())).thenAnswer(inv -> {
            iniciadas.countDown();
            assertTrue(liberar.await(10, java.util.concurrent.TimeUnit.SECONDS));
            return "{\"categoriaId\":1,\"etiquetas\":[]}";
        });
        var pool = java.util.concurrent.Executors.newFixedThreadPool(4);
        try {
            var tareas = new java.util.ArrayList<java.util.concurrent.Future<?>>();
            for (int i=0;i<4;i++) tareas.add(pool.submit(() -> clasificador.clasificar("empanadas", TipoTransaccion.GASTO, categorias)));
            assertTrue(iniciadas.await(10, java.util.concurrent.TimeUnit.SECONDS));
            assertTrue(clasificador.clasificar("empanadas", TipoTransaccion.GASTO, categorias).isEmpty());
            liberar.countDown();
            for (var tarea : tareas) tarea.get(10, java.util.concurrent.TimeUnit.SECONDS);
            verify(groq, times(4)).generateCaptura(anyString(), anyInt());
        } finally { liberar.countDown(); pool.shutdownNow(); }
    }
}
