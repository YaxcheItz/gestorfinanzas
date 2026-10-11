package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PushPrivacidadTest {
    @Test void ocultarMontosImpideQueTituloOCuerpoRevelenElDetalleFinanciero() throws Exception {
        String contenido=new ObjectMapper().writeValueAsString(PushNotificationService.contenidoNotificacion(
                true,"Pago de $1234.56","Compra en Comercio privado por $1234.56","/cuentas"));
        assertFalse(contenido.contains("1234.56"));
        assertFalse(contenido.contains("Comercio privado"));
        assertTrue(contenido.contains("Kaptal"));
        assertTrue(contenido.contains("/cuentas"));
    }

    @Test void sinOcultacionConservaElMensajeSolicitado() throws Exception {
        String contenido=new ObjectMapper().writeValueAsString(PushNotificationService.contenidoNotificacion(
                false,"Recordatorio","Pago pendiente: $1234.56","/cuentas"));
        assertTrue(contenido.contains("Recordatorio"));
        assertTrue(contenido.contains("1234.56"));
    }
}
