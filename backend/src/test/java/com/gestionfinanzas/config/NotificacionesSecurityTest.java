package com.gestionfinanzas.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NotificacionesSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void elHealthCheckSigueSiendoPublico() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk());
    }

    @Test
    void dispararRecordatoriosExigeAutenticacion() throws Exception {
        mockMvc.perform(post("/api/notificaciones/ejecutar-recordatorios"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void enviarMensajesDePruebaExigeAutenticacion() throws Exception {
        mockMvc.perform(post("/api/notificaciones/test-whatsapp").param("telefono", "5219515791240"))
                .andExpect(status().isUnauthorized());
    }
}
