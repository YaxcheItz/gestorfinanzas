package com.gestionfinanzas.service;

import com.gestionfinanzas.model.entity.RefreshToken;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.RolUsuario;
import com.gestionfinanzas.repository.RefreshTokenRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import com.gestionfinanzas.security.JwtUtil;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Sin una transacción de prueba: cada llamada termina y las lecturas posteriores ven lo persistido. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SesionSeguridadIntegrationTest {
    @Autowired private SesionService sesiones;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private RefreshTokenRepository tokens;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private MockMvc mvc;
    @Autowired private JwtUtil jwt;

    private Long usuarioId;
    private TransactionTemplate transaccion;

    @BeforeEach
    void preparar() {
        transaccion = new TransactionTemplate(transactionManager);
        usuarioId = transaccion.execute(status -> usuarios.saveAndFlush(Usuario.builder()
                .nombre("Sesión de prueba")
                .email("sesion-" + UUID.randomUUID() + "@example.com")
                .passwordHash("hash-solo-para-prueba")
                .rol(RolUsuario.ROLE_USER).activo(true).build()).getId());
    }

    @AfterEach
    void limpiar() {
        transaccion.executeWithoutResult(status -> {
            tokens.deleteByUsuarioId(usuarioId);
            usuarios.deleteById(usuarioId);
        });
    }

    @Test
    void laRevocacionPorReutilizacionPersisteYRechazaLosAccessTokensEmitidos() throws Exception {
        var original = emitir();
        var otroDispositivo = emitir();
        var renovada = sesiones.refrescar(original.refreshToken());

        assertThrows(SesionInvalidaException.class, () -> sesiones.refrescar(original.refreshToken()));

        assertEquals(Boolean.TRUE, transaccion.execute(status -> tokens.findByUsuarioId(usuarioId)
                .stream().allMatch(RefreshToken::isRevocado)));
        assertThrows(SesionInvalidaException.class, () -> sesiones.refrescar(renovada.refreshToken()));
        assertThrows(SesionInvalidaException.class, () -> sesiones.refrescar(otroDispositivo.refreshToken()));
        mvc.perform(get("/api/cuentas").header("Authorization", "Bearer " + renovada.auth().token()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rechazarUnRefreshVencidoPersisteSuRevocacion() {
        var sesion = emitir();
        transaccion.executeWithoutResult(status -> {
            RefreshToken token = tokens.findByUsuarioId(usuarioId).getFirst();
            token.setFechaExpiracion(Instant.now().minusSeconds(60));
            tokens.saveAndFlush(token);
        });

        assertThrows(SesionInvalidaException.class, () -> sesiones.refrescar(sesion.refreshToken()));

        assertEquals(Boolean.TRUE, transaccion.execute(status -> tokens.findByUsuarioId(usuarioId).getFirst().isRevocado()));
    }

    @Test
    void renovarSimultaneamenteElMismoTokenSoloPuedeEmitirUnSucesor() throws Exception {
        String original = emitir().refreshToken();
        CountDownLatch preparados = new CountDownLatch(2);
        CountDownLatch iniciar = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var tareas = new ArrayList<java.util.concurrent.Future<Boolean>>();
            for (int i = 0; i < 2; i++) {
                tareas.add(executor.submit(() -> {
                    preparados.countDown();
                    if (!iniciar.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("No inició la prueba");
                    try {
                        sesiones.refrescar(original);
                        return true;
                    } catch (SesionInvalidaException esperado) {
                        return false;
                    }
                }));
            }
            assertTrue(preparados.await(10, TimeUnit.SECONDS));
            iniciar.countDown();
            List<Boolean> resultados = new ArrayList<>();
            for (var tarea : tareas) resultados.add(tarea.get(15, TimeUnit.SECONDS));
            assertEquals(1, resultados.stream().filter(Boolean::booleanValue).count());
            int cantidadTokens = transaccion.execute(status -> tokens.findByUsuarioId(usuarioId).size());
            assertEquals(2, cantidadTokens);
        }
    }

    @Test
    void refreshSinCookieOConCookieFalsaResponde401EnJson() throws Exception {
        mvc.perform(post("/api/auth/refresh").header("X-Gestion-Sesion", "1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
        mvc.perform(post("/api/auth/refresh").header("X-Gestion-Sesion", "1")
                        .cookie(new Cookie("finanzas_refresh", "cookie-inventada")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("La sesión expiró. Inicia sesión nuevamente."));
    }

    @Test
    void cerrarTodasLasSesionesTambienRechazaElAccessToken() throws Exception {
        var sesion = emitir();
        sesiones.revocarTodas(usuarioId);

        mvc.perform(get("/api/cuentas").header("Authorization", "Bearer " + sesion.auth().token()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unTokenDeUnaVersionRevocadaNoPuedeCerrarUnInicioDeSesionPosterior() throws Exception {
        var original = emitir();
        sesiones.refrescar(original.refreshToken());
        assertThrows(SesionInvalidaException.class, () -> sesiones.refrescar(original.refreshToken()));
        var nuevaSesion = emitir();

        assertThrows(SesionInvalidaException.class, () -> sesiones.refrescar(original.refreshToken()));

        var renovada = sesiones.refrescar(nuevaSesion.refreshToken());
        mvc.perform(get("/api/cuentas").header("Authorization", "Bearer " + renovada.auth().token()))
                .andExpect(status().isOk());
    }

    @Test
    void emitirRecargaLaVersionConfirmadaAunqueElLlamadorTengaUnUsuarioEnCache() throws Exception {
        emitir();
        var nueva = transaccion.execute(status -> {
            Usuario cacheado = usuarios.findById(usuarioId).orElseThrow();
            try (var executor = Executors.newSingleThreadExecutor()) {
                var actualizada = executor.submit(() -> {
                    sesiones.revocarTodas(usuarioId);
                    return emitir();
                }).get(15, TimeUnit.SECONDS);
                var emitida = sesiones.emitir(cacheado);
                assertEquals(jwt.extraerTokenVersion(actualizada.auth().token()),
                        jwt.extraerTokenVersion(emitida.auth().token()));
                return emitida;
            } catch (Exception error) {
                throw new IllegalStateException("No se pudo completar la emisión concurrente", error);
            }
        });
        mvc.perform(get("/api/cuentas").header("Authorization", "Bearer " + nueva.auth().token()))
                .andExpect(status().isOk());
    }

    @Test
    void reutilizarLaCookiePorHttpResponde401YPersisteLaInvalidacion() throws Exception {
        var sesion = emitir();
        Cookie cookie = new Cookie("finanzas_refresh", sesion.refreshToken());
        mvc.perform(post("/api/auth/refresh").header("X-Gestion-Sesion", "1").cookie(cookie))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/refresh").header("X-Gestion-Sesion", "1").cookie(cookie))
                .andExpect(status().isUnauthorized());

        assertEquals(Boolean.TRUE, transaccion.execute(status -> tokens.findByUsuarioId(usuarioId)
                .stream().allMatch(RefreshToken::isRevocado)));
        mvc.perform(get("/api/cuentas").header("Authorization", "Bearer " + sesion.auth().token()))
                .andExpect(status().isUnauthorized());
    }

    private SesionService.SesionEmitida emitir() {
        return sesiones.emitir(usuarios.findById(usuarioId).orElseThrow());
    }
}
