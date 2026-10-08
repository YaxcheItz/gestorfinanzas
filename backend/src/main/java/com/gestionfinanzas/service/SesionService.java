package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.response.AuthResponse;
import com.gestionfinanzas.model.entity.RefreshToken;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.repository.RefreshTokenRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import com.gestionfinanzas.security.JwtUtil;
import jakarta.persistence.EntityManager;
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
    private final UsuarioRepository usuarioRepository;
    private final EntityManager entityManager;

    @Value("${jwt.refresh.expiration-ms:2592000000}")
    private long refreshExpirationMs;

    /** Access token mas el refresh token recien emitido. El plano solo vive en la respuesta. */
    public record SesionEmitida(AuthResponse auth, String refreshToken) {}

    @Transactional
    public SesionEmitida emitir(Usuario usuario) {
        Usuario bloqueado = bloquearUsuario(usuario.getId());
        if (!bloqueado.isActivo()) throw new SesionInvalidaException();
        return crearTokens(bloqueado);
    }

    /**
     * Renueva la sesion rotando el refresh token.
     *
     * Un token ya revocado que vuelve a presentarse no es un error de dedo: significa que dos
     * partes tienen la misma credencial, asi que se revocan todas las sesiones del usuario.
     */
    @Transactional(noRollbackFor = SesionInvalidaException.class)
    public SesionEmitida refrescar(String refreshTokenPlano) {
        if (refreshTokenPlano == null || refreshTokenPlano.isBlank()) {
            throw new SesionInvalidaException();
        }
        String tokenHash = hash(refreshTokenPlano);
        Long usuarioId = refreshTokenRepository.findUsuarioIdByTokenHash(tokenHash)
                .orElseThrow(SesionInvalidaException::new);
        // Serializa emisión, rotación y revocación de todas las sesiones de este usuario.
        // Después de esperar se vuelve a leer el token para ver la rotación ya confirmada.
        Usuario usuario = bloquearUsuario(usuarioId);
        RefreshToken presented = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(SesionInvalidaException::new);
        Instant ahora = Instant.now();
        if (presented.estaVencido(ahora)
                || !usuario.isActivo()
                || presented.getTokenVersion() != usuario.getTokenVersion()) {
            presented.setRevocado(true);
            refreshTokenRepository.save(presented);
            throw new SesionInvalidaException();
        }

        if (presented.isRevocado() || presented.getFechaRotacion() != null) {
            log.warn("Refresh token reutilizado; se invalidan las sesiones y sus tokens de acceso");
            revocarTokens(usuario);
            throw new SesionInvalidaException();
        }

        presented.setRevocado(true);
        presented.setFechaRotacion(ahora);
        refreshTokenRepository.save(presented);
        limpiarVencidos(usuarioId, ahora);
        return crearTokens(usuario);
    }

    /** Cierre de sesion: revoca el token si existe. Tolerante a que ya no este. */
    @Transactional
    public void revocar(String refreshTokenPlano) {
        if (refreshTokenPlano == null || refreshTokenPlano.isBlank()) {
            return;
        }
        String tokenHash = hash(refreshTokenPlano);
        refreshTokenRepository.findUsuarioIdByTokenHash(tokenHash).ifPresent(usuarioId -> {
            bloquearUsuario(usuarioId);
            RefreshToken token = refreshTokenRepository.findByTokenHash(tokenHash).orElse(null);
            if (token == null) return;
            token.setRevocado(true);
            refreshTokenRepository.save(token);
        });
    }

    @Transactional
    public void revocarTodas(Long usuarioId) {
        revocarTokens(bloquearUsuario(usuarioId));
    }

    private void revocarTokens(Usuario usuario) {
        // Los JWT ya emitidos también deben dejar de autenticar, no solo sus refresh tokens.
        usuario.setTokenVersion(usuario.getTokenVersion() + 1);
        usuarioRepository.save(usuario);
        refreshTokenRepository.findByUsuarioId(usuario.getId()).forEach(token -> {
            token.setRevocado(true);
            refreshTokenRepository.save(token);
        });
    }

    @Transactional
    public void eliminarTodas(Long usuarioId) {
        bloquearUsuario(usuarioId);
        refreshTokenRepository.deleteByUsuarioId(usuarioId);
    }

    private Usuario bloquearUsuario(Long usuarioId) {
        Usuario usuario = usuarioRepository.findByIdForUpdate(usuarioId).orElseThrow(SesionInvalidaException::new);
        // El filtro JWT o un servicio llamador pudieron cargarlo antes de esperar por el bloqueo.
        entityManager.refresh(usuario);
        return usuario;
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

    private void limpiarVencidos(Long usuarioId, Instant ahora) {
        refreshTokenRepository.deleteByUsuarioIdAndFechaExpiracionBefore(usuarioId, ahora);
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
