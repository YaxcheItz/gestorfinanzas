package com.gestionfinanzas.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "whatsapp.bot.phone=5219515791240",
        "whatsapp.bot.verification-token=local-test-token-with-at-least-thirty-two-characters"
})
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

    @Test
    void solicitarPinExigeAutenticacion() throws Exception {
        mockMvc.perform(post("/api/notificaciones/whatsapp/pin"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void verificacionDelBotEsPublicaPeroRequiereElSecretoCompartido() throws Exception {
        mockMvc.perform(post("/api/notificaciones/whatsapp/verificar-pin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"telefono\":\"5219515791240\",\"pin\":\"123456\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string(containsString("Credencial del bot no válida")));
    }

    @Test
    void verificacionConSecretoAceptadoNoRequiereSesionDeUsuario() throws Exception {
        mockMvc.perform(post("/api/notificaciones/whatsapp/verificar-pin")
                        .header("X-WhatsApp-Bot-Token", "local-test-token-with-at-least-thirty-two-characters")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"telefono\":\"5219515791240\",\"pin\":\"123456\"}"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("\"verificado\":false")));
    }
}
