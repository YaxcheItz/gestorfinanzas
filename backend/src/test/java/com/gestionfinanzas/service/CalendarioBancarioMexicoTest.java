package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CalendarioBancarioMexicoTest {
    record Caso(LocalDate base, LocalDate fecha, boolean verificado) {}

    @Test void contratoCompartidoConElCliente() throws Exception {
        try (var archivo = getClass().getResourceAsStream("/calendario-bancario-mx-casos.json")) {
            assertNotNull(archivo);
            var mapper = new ObjectMapper().registerModule(new JavaTimeModule());
            for (var caso : mapper.readValue(archivo, Caso[].class)) {
                var ajuste = CalendarioBancarioMexico.ajustar(caso.base());
                assertEquals(caso.fecha(), ajuste.fecha(), caso.base().toString());
                assertEquals(caso.verificado(), ajuste.verificado(), caso.base().toString());
            }
        }
    }
}
