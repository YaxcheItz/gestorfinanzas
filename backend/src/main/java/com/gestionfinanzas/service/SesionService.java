package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.response.AuthResponse;
import com.gestionfinanzas.model.entity.RefreshToken;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.repository.RefreshTokenRepository;
import com.gestionfinanzas.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Ciclo de vida de la sesion.
 *
 * El access token es un JWT corto que viaja en la cabecera Authorization. El refresh token es
 * una credencial opaca, aleatoria y de larga duracion que viaja en cookie httpOnly, de modo que
 * el JavaScript de la pagina no puede leerla.
 *
 * Cada refresco rota el token: el viejo queda revocado y se emite uno nuevo. Si alguien copio una
 * cookie, en cuanto el dueño la use de forma normal el ladrón se queda con un token muerto; y si
 * el ladrón la usa antes, el dueño detecta la reutilizacion y se cierran todas sus sesiones.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SesionService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final JwtUtil jwtUtil;
    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.refresh.expiration-ms:2592000000}")
    private long refreshExpirationMs;

    /** Access token mas el refresh token recien emitido. El plano solo vive en la respuesta. */
    public record SesionEmitida(AuthResponse auth, String refreshToken) {}

    @Transactional
    public SesionEmitida emitir(Usuario usuario) {
        return crearTokens(usuario);
    }

    /**
     * Renueva la sesion rotando el refresh token.
     *
     * Un token ya revocado que vuelve a presentarse no es un error de dedo: significa que dos
     * partes tienen la misma credencial, asi que se revocan todas las sesiones del usuario.
     */
    @Transactional
    public SesionEmitida refrescar(String refreshTokenPlano) {
        if (refreshTokenPlano == null || refreshTokenPlano.isBlank()) {
            throw new SesionInvalidaException();
        }
        Instant ahora = Instant.now();
        RefreshToken presented = refreshTokenRepository.findByTokenHash(hash(refreshTokenPlano))
                .orElseThrow(SesionInvalidaException::new);

        if (presented.isRevocado() || presented.getFechaRotacion() != null) {
            log.warn("Refresh token ya rotado de nuevo presentado; se cierran todas las sesiones");
            revocarTodas(presented.getUsuario().getId());
            throw new SesionInvalidaException();
        }

        Usuario usuario = presented.getUsuario();
        if (presented.estaVencido(ahora)
                || !usuario.isActivo()
                || presented.getTokenVersion() != usuario.getTokenVersion()) {
            presented.setRevocado(true);
            refreshTokenRepository.save(presented);
            throw new SesionInvalidaException();
        }

        presented.setRevocado(true);
        presented.setFechaRotacion(ahora);
        refreshTokenRepository.save(presented);
        limpiarVencidos(ahora);
        return crearTokens(usuario);
    }

    /** Cierre de sesion: revoca el token si existe. Tolerante a que ya no este. */
    @Transactional
    public void revocar(String refreshTokenPlano) {
        if (refreshTokenPlano == null || refreshTokenPlano.isBlank()) {
            return;
        }
        refreshTokenRepository.findByTokenHash(hash(refreshTokenPlano)).ifPresent(token -> {
            token.setRevocado(true);
            refreshTokenRepository.save(token);
        });
    }

    @Transactional
    public void revocarTodas(Long usuarioId) {
        refreshTokenRepository.findByUsuarioId(usuarioId).forEach(token -> {
            token.setRevocado(true);
            refreshTokenRepository.save(token);
        });
    }

    @Transactional
    public void eliminarTodas(Long usuarioId) {
        refreshTokenRepository.deleteByUsuarioId(usuarioId);
    }

    private SesionEmitida crearTokens(Usuario usuario) {
        String acceso = jwtUtil.generarToken(usuario.getEmail(), usuario.getId(), usuario.getTokenVersion());
        String refreshPlano = generarAleatorio();
        refreshTokenRepository.save(RefreshToken.builder()
                .usuario(usuario)
                .tokenHash(hash(refreshPlano))
                .tokenVersion(usuario.getTokenVersion())
                .fechaExpiracion(Instant.now().plusMillis(refreshExpirationMs))
                .revocado(false)
                .build());
        return new SesionEmitida(
                AuthResponse.of(acceso, usuario.getId(), usuario.getNombre(), usuario.getEmail(),
                        usuario.getGoogleSubject() != null),
                refreshPlano);
    }

    private void limpiarVencidos(Instant ahora) {
        refreshTokenRepository.deleteByFechaExpiracionBefore(ahora);
    }

    private static String generarAleatorio() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}
