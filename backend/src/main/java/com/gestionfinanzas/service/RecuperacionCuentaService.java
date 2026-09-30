package com.gestionfinanzas.service;

import com.gestionfinanzas.model.entity.TokenRecuperacionPassword;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.repository.TokenRecuperacionPasswordRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class RecuperacionCuentaService {

    private static final Duration TOKEN_TTL = Duration.ofMinutes(30);
    private static final Duration INTERVALO_ENTRE_SOLICITUDES = Duration.ofSeconds(60);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UsuarioRepository usuarioRepository;
    private final TokenRecuperacionPasswordRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher eventPublisher;
    private final SesionService sesionService;

    @Value("${app.mail.enabled:false}")
    private boolean correoHabilitado;

    @Value("${spring.mail.host:}")
    private String servidorCorreo;

    @Transactional
    public boolean solicitarRecuperacion(String email) {
        if (!correoHabilitado || servidorCorreo.isBlank()) return false;
        String normalizado = email.trim().toLowerCase();
        usuarioRepository.findByEmail(normalizado).ifPresent(usuario -> crearYEnviarToken(usuario));
        return true;
    }

    @Transactional
    public void restablecerPassword(String token, String passwordNueva) {
        if (passwordNueva.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("La contraseña no puede superar el límite de seguridad admitido.");
        }
        Instant ahora = Instant.now();
        TokenRecuperacionPassword recuperacion = tokenRepository
                .findByTokenHashAndUsadoFalseAndFechaExpiracionAfter(hash(token), ahora)
                .orElseThrow(() -> new IllegalArgumentException("El enlace de recuperación no es válido o ya expiró."));

        Usuario usuario = recuperacion.getUsuario();
        usuario.setPasswordHash(passwordEncoder.encode(passwordNueva));
        usuario.setTokenVersion(usuario.getTokenVersion() + 1);
        usuarioRepository.save(usuario);
        tokenRepository.deleteByUsuarioId(usuario.getId());
        sesionService.revocarTodas(usuario.getId());
    }

    private void crearYEnviarToken(Usuario usuario) {
        Instant ahora = Instant.now();
        boolean dentroDelLimite = tokenRepository.findFirstByUsuarioIdOrderByFechaCreacionDesc(usuario.getId())
                .map(ultimo -> ultimo.getFechaCreacion().isAfter(ahora.minus(INTERVALO_ENTRE_SOLICITUDES)))
                .orElse(false);
        if (dentroDelLimite) return;
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String tokenPlano = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokenRepository.deleteByUsuarioId(usuario.getId());
        tokenRepository.save(TokenRecuperacionPassword.builder()
                .usuario(usuario)
                .tokenHash(hash(tokenPlano))
                .fechaExpiracion(ahora.plus(TOKEN_TTL))
                .usado(false)
                .build());

        eventPublisher.publishEvent(new RecuperacionCorreoEvent(usuario.getId(), usuario.getEmail(), tokenPlano));
    }

    private static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}
