package com.gestionfinanzas.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Envio por la API de Resend, que viaja sobre HTTPS.
 *
 * Existe porque el plan gratuito de Render no permite salir por SMTP, y sin
 * esto la recuperacion de contrasena se quedaria sin correo en ese entorno.
 */
@Component
@ConditionalOnProperty(name = "app.mail.provider", havingValue = "resend")
@Slf4j
public class EnvioCorreoResend implements EnvioCorreo {

    private static final String ENDPOINT = "https://api.resend.com/emails";

    private final RestClient restClient;

    @Value("${app.mail.from:no-reply@kaptal.app}")
    private String remitente;

    @Value("${resend.api-key:}")
    private String apiKey;

    public EnvioCorreoResend(RestClient.Builder builder) {
        this.restClient = builder.build();
    }

    @Override
    public void enviar(String destinatario, String asunto, String cuerpo) {
        if (apiKey.isBlank()) {
            throw new MailDeliveryException(
                    new IllegalStateException("RESEND_API_KEY no esta configurada"));
        }
        try {
            restClient.post()
                    .uri(ENDPOINT)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + apiKey)
                    .body(new Solicitud(remitente, destinatario, asunto, cuerpo))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RuntimeException exception) {
            throw new MailDeliveryException(exception);
        }
        log.info("Correo '{}' entregado a {} via Resend", asunto, destinatario);
    }

    private record Solicitud(String from, String[] to, String subject, String text) {
        Solicitud(String from, String to, String subject, String text) {
            this(from, new String[]{to}, subject, text);
        }
    }
}
