package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestionfinanzas.dto.request.SuscripcionPushRequest;
import com.gestionfinanzas.model.entity.SuscripcionNotificacion;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.repository.SuscripcionNotificacionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.security.Security;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PushNotificationService {

    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);
    private static final int TTL_SEGUNDOS = 60 * 60 * 24;
    private static final List<String> HOSTS_PUSH_PERMITIDOS = List.of(
            "googleapis.com", "mozilla.com", "apple.com", "windows.com"
    );

    private final SuscripcionNotificacionRepository suscripciones;
    private final UsuarioRepository usuarios;
    private final ObjectMapper objectMapper;

    @Value("${app.push.public-key:}")
    private String clavePublica;

    @Value("${app.push.private-key:}")
    private String clavePrivada;

    @Value("${app.push.subject:}")
    private String subject;

    public record ConfiguracionPush(boolean configurado, String clavePublica) {}

    public ConfiguracionPush configuracion() {
        boolean configurado = !clavePublica.isBlank() && !clavePrivada.isBlank() && !subject.isBlank();
        return new ConfiguracionPush(configurado, configurado ? clavePublica : null);
    }

    @Transactional
    public void guardarSuscripcion(Long usuarioId, SuscripcionPushRequest request) {
        URI endpoint = validarEndpoint(request.endpoint());
        Usuario usuario = usuarios.findById(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        SuscripcionNotificacion suscripcion = suscripciones.findByEndpoint(endpoint.toString())
                .orElseGet(SuscripcionNotificacion::new);
        suscripcion.setUsuario(usuario);
        suscripcion.setEndpoint(endpoint.toString());
        suscripcion.setClavePublica(request.keys().p256dh());
        suscripcion.setSecretoAuth(request.keys().auth());
        suscripciones.save(suscripcion);
    }

    @Transactional
    public void eliminarSuscripcion(Long usuarioId, String endpoint) {
        URI uri = validarEndpoint(endpoint);
        suscripciones.deleteByEndpointAndUsuarioId(uri.toString(), usuarioId);
    }

    public boolean usuarioTieneSuscripciones(Long usuarioId) {
        return suscripciones.existsByUsuarioId(usuarioId);
    }

    public int notificarUsuario(Long usuarioId, String titulo, String cuerpo, String ruta) {
        if (!configuracion().configurado()) return 0;

        List<SuscripcionNotificacion> destinos = suscripciones.findAllByUsuarioId(usuarioId);
        int enviadas = 0;
        for (SuscripcionNotificacion destino : destinos) {
            try {
                enviar(destino, titulo, cuerpo, ruta);
                enviadas++;
            } catch (Exception error) {
                log.warn("Falló una notificación push para la suscripción {} ({}).",
                        destino.getId(), error.getClass().getSimpleName());
                if (error instanceof PushRechazadoException rechazado
                        && (rechazado.status() == 404 || rechazado.status() == 410)) {
                    suscripciones.delete(destino);
                }
            }
        }
        return enviadas;
    }

    private void enviar(SuscripcionNotificacion suscripcion, String titulo, String cuerpo, String ruta)
            throws Exception {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        PushService servicio = new PushService(clavePublica, clavePrivada, subject);
        Map<String, Object> payload = Map.of(
                "notification", Map.of(
                        "title", titulo,
                        "body", cuerpo,
                        "icon", "/icons/kaptal-192.png",
                        "badge", "/icons/kaptal-192.png",
                        "tag", "kaptal-recordatorio",
                        "data", Map.of("url", ruta)
                )
        );
        byte[] contenido = objectMapper.writeValueAsBytes(payload);
        Notification notificacion = new Notification(
                suscripcion.getEndpoint(),
                suscripcion.getClavePublica(),
                suscripcion.getSecretoAuth(),
                contenido,
                TTL_SEGUNDOS
        );
        var respuesta = servicio.send(notificacion);
        int status = respuesta.getStatusLine().getStatusCode();
        if (status < 200 || status >= 300) throw new PushRechazadoException(status);
    }

    private URI validarEndpoint(String valor) {
        final URI uri;
        try {
            uri = URI.create(valor);
        } catch (IllegalArgumentException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Endpoint push inválido");
        }
        String host = uri.getHost();
        boolean hostPermitido = host != null && HOSTS_PUSH_PERMITIDOS.stream()
                .anyMatch(dominio -> host.equalsIgnoreCase(dominio)
                        || host.toLowerCase().endsWith("." + dominio));
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getUserInfo() != null
                || (uri.getPort() != -1 && uri.getPort() != 443) || !hostPermitido) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Proveedor push no admitido");
        }
        return uri;
    }

    private static final class PushRechazadoException extends Exception {
        private final int status;

        private PushRechazadoException(int status) {
            this.status = status;
        }

        int status() {
            return status;
        }
    }
}
