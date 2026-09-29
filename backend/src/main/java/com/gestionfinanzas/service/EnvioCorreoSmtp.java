package com.gestionfinanzas.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Envio por SMTP, para desarrollo y para entornos con salida SMTP habilitada.
 */
@Component
@ConditionalOnProperty(name = "app.mail.provider", havingValue = "smtp", matchIfMissing = true)
@Slf4j
public class EnvioCorreoSmtp implements EnvioCorreo {

    private final JavaMailSender mailSender;

    public EnvioCorreoSmtp(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void enviar(String destinatario, String asunto, String cuerpo) {
        SimpleMailMessage mensaje = new SimpleMailMessage();
        mensaje.setTo(destinatario);
        mensaje.setSubject(asunto);
        mensaje.setText(cuerpo);
        try {
            mailSender.send(mensaje);
        } catch (MailException exception) {
            log.warn("Could not deliver email to {}: {}", destinatario, exception.getMessage());
            throw new MailDeliveryException(exception);
        }
    }
}
