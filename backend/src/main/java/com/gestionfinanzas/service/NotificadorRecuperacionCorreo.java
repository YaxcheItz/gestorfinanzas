package com.gestionfinanzas.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificadorRecuperacionCorreo {

    private final EnvioCorreo envioCorreo;

    @Value("${app.mail.enabled:false}")
    private boolean correoHabilitado;

    @Value("${app.mail.provider:smtp}")
    private String proveedorCorreo;

    @Value("${app.mail.from:no-reply@kaptal.app}")
    private String correoRemitente;

    @Value("${app.frontend-url:http://localhost:4200}")
    private String urlFrontend;

    @Async("recoveryMailExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void enviar(RecuperacionCorreoEvent evento) {
        if (!correoHabilitado) return;
        String link = UriComponentsBuilder.fromUriString(urlFrontend)
                .path("/recuperar-cuenta")
                .queryParam("token", evento.token())
                .build()
                .encode()
                .toUriString();
        try {
            envioCorreo.enviar(evento.email(), "Recupera el acceso a tu cuenta Kaptal",
                    "Recibimos una solicitud para cambiar la contrasena de tu cuenta Kaptal.\n\n"
                    + "Abre este enlace antes de 30 minutos para elegir una nueva contrasena:\n" + link
                    + "\n\nSi no solicitaste este cambio, puedes ignorar este mensaje. Tu contrasena no cambiara.");
        } catch (RuntimeException exception) {
            log.warn("No se pudo enviar el correo de recuperacion para el usuario {} via {}: {}",
                    evento.usuarioId(), proveedorCorreo, exception.getMessage());
        }
    }
}
