package com.gestionfinanzas.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Los gastos compartidos dicen quien te debe que a quien, asi que ninguna de sus
 * rutas puede quedar abierta. Se comprueba endpoint por endpoint porque la regla
 * que las cubre es un anyRequest().authenticated() que basta con mover de lugar
 * para que alguna se quede filtrando datos de otra pareja.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ParejaControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void leerLaParejaExigeAutenticacion() throws Exception {
        mockMvc.perform(get("/api/pareja"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void vincularExigeAutenticacion() throws Exception {
        mockMvc.perform(post("/api/pareja")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "luis@example.com"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registrarMovimientosExigeAutenticacion() throws Exception {
        mockMvc.perform(post("/api/pareja/aportes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("monto", "100.00"))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/pareja/gastos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("monto", "100.00"))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/pareja/pagos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("monto", "100.00"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void borrarYDesvincularExigenAutenticacion() throws Exception {
        mockMvc.perform(delete("/api/pareja/aportes/1")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/pareja/gastos/1")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/pareja/pagos/1")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/pareja/1")).andExpect(status().isUnauthorized());
    }
}
