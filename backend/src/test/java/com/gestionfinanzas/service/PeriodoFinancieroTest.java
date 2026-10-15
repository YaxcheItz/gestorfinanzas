package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

class PeriodoFinancieroTest {
    record Caso(String nombre, PeriodoFinanciero.Config config, LocalDate referencia, PeriodoFinanciero.Rango esperado) {}

    @Test void contratoCompartidoConElCliente() throws Exception {
        var mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        try (var archivo = getClass().getResourceAsStream("/periodos.json")) {
            assertNotNull(archivo);
            for (var caso : mapper.readValue(archivo, Caso[].class)) {
                assertEquals(caso.esperado(), PeriodoFinanciero.resolver(caso.config(), caso.referencia()), caso.nombre());
            }
        }
    }

    @Test void navegarNoPierdeElDia31NiDejaHuecos() {
        var config = new PeriodoFinanciero.Config("MES", LocalDate.of(2026, 1, 5), 31, 16);
        var marzo = PeriodoFinanciero.resolver(config, LocalDate.of(2024, 3, 31));
        var febrero = PeriodoFinanciero.desplazar(config, marzo, -1);
        assertEquals(LocalDate.of(2024, 2, 29), febrero.desde());
        assertEquals(marzo.desde().minusDays(1), febrero.hasta());
        assertEquals(marzo, PeriodoFinanciero.desplazar(config, febrero, 1));
    }

    @Test void rechazaConfiguracionesYRangosInvalidos() {
        assertThrows(IllegalArgumentException.class, () -> new PeriodoFinanciero.Config("OTRO", LocalDate.now(), 1, 16));
        assertThrows(IllegalArgumentException.class, () -> new PeriodoFinanciero.Config("QUINCENA", LocalDate.now(), 28, 31));
        assertThrows(IllegalArgumentException.class, () -> new PeriodoFinanciero.Config("QUINCENA", LocalDate.now(), 16, 16));
        assertThrows(IllegalArgumentException.class, () -> new PeriodoFinanciero.Config("MES", null, 1, 16));
        assertThrows(IllegalArgumentException.class, () -> new PeriodoFinanciero.Rango(LocalDate.of(2026, 2, 1), LocalDate.of(2026, 1, 1)));
    }
}
