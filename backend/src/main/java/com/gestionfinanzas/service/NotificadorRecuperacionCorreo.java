package com.gestionfinanzas.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificadorRecuperacionCorreo {

    private final JavaMailSender mailSender;

    @Value("${app.mail.enabled:false}")
    private boolean correoHabilitado;

    @Value("${spring.mail.host:}")
    private String servidorCorreo;

    @Value("${app.mail.from:no-reply@kaptal.app}")
    private String correoRemitente;

    @Value("${app.frontend-url:http://localhost:4200}")
    private String urlFrontend;

    @Async("recoveryMailExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void enviar(RecuperacionCorreoEvent evento) {
        if (!correoHabilitado || servidorCorreo.isBlank()) return;
        String link = UriComponentsBuilder.fromUriString(urlFrontend)
                .path("/recuperar-cuenta")
                .queryParam("token", evento.token())
                .build()
                .encode()
                .toUriString();
        SimpleMailMessage mensaje = new SimpleMailMessage();
        mensaje.setFrom(correoRemitente);
        mensaje.setTo(evento.email());
        mensaje.setSubject("Recupera el acceso a tu cuenta Kaptal");
        mensaje.setText("Recibimos una solicitud para cambiar la contraseña de tu cuenta Kaptal.\n\n"
                + "Abre este enlace antes de 30 minutos para elegir una nueva contraseña:\n" + link
                + "\n\nSi no solicitaste este cambio, puedes ignorar este mensaje. Tu contraseña no cambiará.");
        try {
            mailSender.send(mensaje);
        } catch (MailException exception) {
            log.warn("Could not deliver account recovery email for user id {}", evento.usuarioId());
        }
    }
}
