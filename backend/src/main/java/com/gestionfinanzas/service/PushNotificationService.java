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
import org.bouncycastle.asn1.sec.SECNamedCurves;
import org.springframework.dao.DataIntegrityViolationException;
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
import java.util.Base64;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class PushNotificationService {

    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);
    private static final int TTL_SEGUNDOS = 60 * 60 * 24;
    private static final List<String> HOSTS_PUSH_PERMITIDOS = List.of(
            "fcm.googleapis.com", "updates.push.services.mozilla.com"
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

    private static final int MAX_SUSCRIPCIONES_POR_USUARIO = 20;

    public record ConfiguracionPush(boolean configurado, String clavePublica) {}

    public ConfiguracionPush configuracion() {
        boolean configurado = !clavePublica.isBlank() && !clavePrivada.isBlank() && !subject.isBlank();
        return new ConfiguracionPush(configurado, configurado ? clavePublica : null);
    }

    @Transactional
    public void guardarSuscripcion(Long usuarioId, SuscripcionPushRequest request) {
        URI endpoint = validarEndpoint(request.endpoint());
        validarClaves(request.keys());
        // Serializa altas por usuario: dos dispositivos no pueden superar el límite a la vez.
        Usuario usuario = usuarios.findByIdForUpdate(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        SuscripcionNotificacion suscripcion = suscripciones.findByEndpoint(endpoint.toString())
                .orElseGet(SuscripcionNotificacion::new);
        if (suscripcion.getUsuario() != null && !suscripcion.getUsuario().getId().equals(usuarioId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La suscripción ya está vinculada");
        }
        if (suscripcion.getId() == null
                && suscripciones.countByUsuarioId(usuarioId) >= MAX_SUSCRIPCIONES_POR_USUARIO) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Límite de dispositivos push alcanzado");
        }
        suscripcion.setUsuario(usuario);
        suscripcion.setEndpoint(endpoint.toString());
        suscripcion.setClavePublica(request.keys().p256dh());
        suscripcion.setSecretoAuth(request.keys().auth());
        try {
            suscripciones.saveAndFlush(suscripcion);
        } catch (DataIntegrityViolationException conflicto) {
            // Dos usuarios podrían presentar el mismo endpoint simultáneamente.
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La suscripción ya está vinculada");
        }
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
        Usuario usuario = usuarios.findById(usuarioId).orElse(null);
        if (usuario == null || !usuario.isActivo()) return 0;

        List<SuscripcionNotificacion> destinos = suscripciones.findAllByUsuarioId(usuarioId);
        int enviadas = 0;
        for (SuscripcionNotificacion destino : destinos) {
            try {
                enviar(destino, titulo, cuerpo, ruta, usuario.isOcultarMontos());
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

    private void enviar(SuscripcionNotificacion suscripcion, String titulo, String cuerpo, String ruta, boolean ocultarMontos)
            throws Exception {
        // También se valida lo persistido antes de realizar cualquier llamada de red.
        validarEndpoint(suscripcion.getEndpoint());
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        PushService servicio = new PushService(clavePublica, clavePrivada, subject);
        byte[] contenido = objectMapper.writeValueAsBytes(contenidoNotificacion(ocultarMontos, titulo, cuerpo, ruta));
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

    static Map<String, Object> contenidoNotificacion(boolean ocultarMontos, String titulo, String cuerpo, String ruta) {
        return Map.of(
                "notification", Map.of(
                        "title", ocultarMontos ? "Kaptal" : titulo,
                        "body", ocultarMontos ? "Tienes una actualización financiera. Abre Kaptal para consultarla." : cuerpo,
                        "icon", "/icons/kaptal-192.png",
                        "badge", "/icons/kaptal-192.png",
                        "tag", "kaptal-recordatorio",
                        "data", Map.of("url", ruta)
                )
        );
    }

    private URI validarEndpoint(String valor) {
        final URI uri;
        try {
            if (valor == null || valor.length() > 2048) throw new IllegalArgumentException();
            uri = URI.create(valor);
        } catch (IllegalArgumentException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Endpoint push inválido");
        }
        String host = uri.getHost();
        String normalizado = host == null ? "" : host.toLowerCase(Locale.ROOT);
        boolean hostPermitido = HOSTS_PUSH_PERMITIDOS.contains(normalizado)
                || normalizado.endsWith(".push.services.mozilla.com")
                || normalizado.endsWith(".push.apple.com")
                || normalizado.endsWith(".notify.windows.com");
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getUserInfo() != null
                || (uri.getPort() != -1 && uri.getPort() != 443) || !hostPermitido
                || uri.getFragment() != null || uri.getRawPath() == null || uri.getRawPath().length() <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Proveedor push no admitido");
        }
        return uri;
    }

    private void validarClaves(SuscripcionPushRequest.ClavesPushRequest claves) {
        try {
            if (claves == null || claves.p256dh() == null || claves.auth() == null
                    || claves.p256dh().length() > 200 || claves.auth().length() > 100) {
                throw new IllegalArgumentException();
            }
            byte[] publica = Base64.getUrlDecoder().decode(claves.p256dh());
            byte[] auth = Base64.getUrlDecoder().decode(claves.auth());
            if (publica.length != 65 || publica[0] != 4 || auth.length != 16
                    || !SECNamedCurves.getByName("secp256r1").getCurve().decodePoint(publica).isValid()) {
                throw new IllegalArgumentException();
            }
        } catch (IllegalArgumentException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Claves push inválidas");
        }
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
