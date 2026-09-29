package com.gestionfinanzas.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class NotificacionWhatsAppService {

    private static final Logger log = LoggerFactory.getLogger(NotificacionWhatsAppService.class);

    @Value("${twilio.account_sid:}")
    private String accountSid;

    @Value("${twilio.auth_token:}")
    private String authToken;

    @Value("${twilio.whatsapp_number:}")
    private String fromNumber;

    @PostConstruct
    public void init() {
        if (!accountSid.isEmpty() && !authToken.isEmpty()) {
            Twilio.init(accountSid, authToken);
            log.info("Twilio WhatsApp Service inicializado.");
        } else {
            log.warn("Twilio no está configurado. Las notificaciones de WhatsApp están desactivadas.");
        }
    }

    public String enviarRecordatorio(String toPhoneNumber, String mensaje) {
        if (accountSid == null || accountSid.isBlank() || authToken == null || authToken.isBlank()) {
            log.warn("Intento de enviar WhatsApp omitido: faltan credenciales de Twilio.");
            return "Twilio no está configurado en las variables de entorno (falta TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN en Render).";
        }

        String destino = normalizarTelefono(toPhoneNumber);
        String origen = normalizarTelefono(fromNumber);

        if (destino.isBlank()) {
            return "Número de teléfono de destino inválido.";
        }
        if (origen.isBlank()) {
            return "Número de WhatsApp origen (TWILIO_WHATSAPP_NUMBER) no configurado.";
        }

        try {
            Message message = Message.creator(
                    new PhoneNumber("whatsapp:" + destino),
                    new PhoneNumber("whatsapp:" + origen),
                    mensaje
            ).create();
            log.info("Mensaje de WhatsApp enviado con éxito a {}. SID: {}", destino, message.getSid());
            return "Mensaje enviado exitosamente a " + destino + ". SID: " + message.getSid();
        } catch (Exception e) {
            log.error("Error enviando mensaje de WhatsApp a {}: {}", destino, e.getMessage());
            return "Error al enviar mensaje vía Twilio: " + e.getMessage();
        }
    }

    private String normalizarTelefono(String telefono) {
        if (telefono == null) return "";
        String limpio = telefono.trim().replaceAll("[^0-9+]", "");
        if (limpio.isEmpty()) return "";
        if (!limpio.startsWith("+")) {
            limpio = "+" + limpio;
        }
        return limpio;
    }
}
