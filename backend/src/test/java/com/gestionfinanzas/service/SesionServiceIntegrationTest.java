package com.gestionfinanzas.service;

import com.gestionfinanzas.model.entity.RefreshToken;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.RolUsuario;
import com.gestionfinanzas.repository.RefreshTokenRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SesionServiceIntegrationTest {

    private static final String PASSWORD = "Password123";

    @Autowired private SesionService sesionService;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RefreshTokenRepository refreshTokenRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private Usuario usuario;

    @BeforeEach
    void prepararUsuario() {
        usuario = usuarioRepository.saveAndFlush(Usuario.builder()
                .nombre("Ana")
                .email("ana.sesion@example.com")
                .passwordHash(passwordEncoder.encode(PASSWORD))
                .rol(RolUsuario.ROLE_USER)
                .activo(true)
                .build());
    }

    @Test
    void alEntrarDejaUnAccessTokenYUnRefreshToken() {
        SesionService.SesionEmitida sesion = sesionService.emitir(usuario);

        assertNotNull(sesion.auth().token());
        assertNotNull(sesion.refreshToken());
        assertEquals(1, refreshTokenRepository.findByUsuarioId(usuario.getId()).size());
    }

    @Test
    void nuncaGuardaElRefreshTokenEnClaro() {
        String plano = sesionService.emitir(usuario).refreshToken();

        String guardado = refreshTokenRepository.findByUsuarioId(usuario.getId()).get(0).getTokenHash();

        assertNotEquals(plano, guardado);
        assertFalse(guardado.contains(plano));
    }

    @Test
    void renovarEntregaUnTokenDistintoYDejaElViejoRevocado() {
        String original = sesionService.emitir(usuario).refreshToken();

        SesionService.SesionEmitida renovada = sesionService.refrescar(original);

        assertNotEquals(original, renovada.refreshToken());
        List<RefreshToken> tokens = refreshTokenRepository.findByUsuarioId(usuario.getId());
        RefreshToken viejo = tokens.stream()
                .filter(t -> t.getTokenHash().length() == 64)
                .filter(t -> t.isRevocado())
                .findFirst().orElseThrow();
        assertNotNull(viejo.getFechaRotacion());
        assertEquals(1, tokens.stream().filter(t -> !t.isRevocado()).count());
    }

    @Test
    void sinCookieNoSeRenueva() {
        assertThrows(SesionInvalidaException.class, () -> sesionService.refrescar(null));
        assertThrows(SesionInvalidaException.class, () -> sesionService.refrescar("  "));
    }

    @Test
    void unTokenFalsoSeRechaza() {
        sesionService.emitir(usuario);

        assertThrows(SesionInvalidaException.class, () -> sesionService.refrescar("token-inventado"));
    }

    /**
     * Si un token ya rotado vuelve a aparecer, no es un error de dedo: hay dos partes con la
     * misma credencial. Se cierran todas las sesiones del usuario para cortar el acceso robado.
     */
    @Test
    void reutilizarUnTokenYaRotadoCierraTodasLasSesiones() {
        String original = sesionService.emitir(usuario).refreshToken();
        String renewal = sesionService.refrescar(original).refreshToken();

        assertThrows(SesionInvalidaException.class, () -> sesionService.refrescar(original));

        assertThrows(SesionInvalidaException.class, () -> sesionService.refrescar(renewal));
        assertTrue(refreshTokenRepository.findByUsuarioId(usuario.getId())
                .stream().allMatch(RefreshToken::isRevocado));
    }

    @Test
    void unRefreshVencidoNoRenueva() {
        String original = sesionService.emitir(usuario).refreshToken();
        RefreshToken token = refreshTokenRepository.findByUsuarioId(usuario.getId()).get(0);
        token.setFechaExpiracion(Instant.now().minusSeconds(60));
        refreshTokenRepository.saveAndFlush(token);

        assertThrows(SesionInvalidaException.class, () -> sesionService.refrescar(original));
    }

    /**
     * Cambiar la contraseña sube la versión del token. El access token muere por eso, pero el
     * refresh es de larga duración: sin esta comprobación, el ladrón podría seguir renovando.
     */
    @Test
    void cambiarLaContraseñaInvalidaElRefreshTokenEmitidoAntes() {
        String original = sesionService.emitir(usuario).refreshToken();
        usuario.setTokenVersion(usuario.getTokenVersion() + 1);
        usuarioRepository.saveAndFlush(usuario);

        assertThrows(SesionInvalidaException.class, () -> sesionService.refrescar(original));
    }

    @Test
    void unaCuentaDesactivadaNoRenueva() {
        String original = sesionService.emitir(usuario).refreshToken();
        usuario.setActivo(false);
        usuarioRepository.saveAndFlush(usuario);

        assertThrows(SesionInvalidaException.class, () -> sesionService.refrescar(original));
    }

    @Test
    void cerrarSesionRevocaElTokenYEsIndiferenteRepetirlo() {
        String original = sesionService.emitir(usuario).refreshToken();

        sesionService.revocar(original);
        sesionService.revocar(original);
        sesionService.revocar(null);

        assertThrows(SesionInvalidaException.class, () -> sesionService.refrescar(original));
    }

    @Test
    void revocarTodasCierraCadaDispositivo() {
        String laptop = sesionService.emitir(usuario).refreshToken();
        String celular = sesionService.emitir(usuario).refreshToken();
        sesionService.refrescar(laptop);

        sesionService.revocarTodas(usuario.getId());

        assertTrue(refreshTokenRepository.findByUsuarioId(usuario.getId())
                .stream().allMatch(RefreshToken::isRevocado));
    }

    @Test
    void eliminarLasSesionesDejaLaTablaLimpiaParaPoderBorrarElUsuario() {
        sesionService.emitir(usuario);

        sesionService.eliminarTodas(usuario.getId());

        assertTrue(refreshTokenRepository.findByUsuarioId(usuario.getId()).isEmpty());
    }

    @Test
    void renovarLimpiaLosTokensVencidos() {
        sesionService.emitir(usuario);
        RefreshToken vencido = refreshTokenRepository.findByUsuarioId(usuario.getId()).get(0);
        vencido.setFechaExpiracion(Instant.now().minusSeconds(60));
        refreshTokenRepository.saveAndFlush(vencido);

        // Sesion nueva y valida: renovar con ella arrastra la limpieza de la caducada.
        String vigente = sesionService.emitir(usuario).refreshToken();
        sesionService.refrescar(vigente);

        List<RefreshToken> restantes = refreshTokenRepository.findByUsuarioId(usuario.getId());
        assertTrue(restantes.stream().noneMatch(t -> t.estaVencido(Instant.now())),
                "el token caducado debe haberse borrado");
        // Quedan dos: el rotado, que se revoca pero se conserva para detectar reutilizacion,
        // y el recien emitido. Solo uno sirve.
        assertEquals(2, restantes.size());
        assertEquals(1, restantes.stream().filter(t -> !t.isRevocado()).count());
    }
}
