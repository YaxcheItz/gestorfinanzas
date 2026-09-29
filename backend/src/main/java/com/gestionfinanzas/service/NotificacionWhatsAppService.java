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
            log.warn("Twilio no est configurado. Las notificaciones de WhatsApp estn desactivadas.");
        }
    }

    public void enviarRecordatorio(String toPhoneNumber, String mensaje) {
        if (accountSid.isEmpty() || authToken.isEmpty()) {
            log.warn("Intento de enviar WhatsApp omitido porque Twilio no est configurado.");
            return;
        }

        try {
            Message message = Message.creator(
                    new PhoneNumber("whatsapp:" + toPhoneNumber),
                    new PhoneNumber("whatsapp:" + fromNumber),
                    mensaje
            ).create();
            log.info("Mensaje de WhatsApp enviado con xito. SID: {}", message.getSid());
        } catch (Exception e) {
            log.error("Error enviangdo mensaje de WhatsApp: {}", e.getMessage());
        }
    }
}
