package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.CambiarPasswordRequest;
import com.gestionfinanzas.dto.request.PerfilActualizarRequest;
import com.gestionfinanzas.dto.response.PerfilResponse;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PerfilServiceTest {

    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final SesionService sesionService = mock(SesionService.class);
    private final PerfilService perfilService = new PerfilService(usuarioRepository, passwordEncoder, sesionService);

    @Test
    void cambiarPasswordIncrementaLaVersionQueRevocaTokensPrevios() {
        Usuario usuario = Usuario.builder()
                .id(17L)
                .email("ana@example.com")
                .nombre("Ana")
                .passwordHash("hash-anterior")
                .tokenVersion(2)
                .build();
        when(usuarioRepository.findById(17L)).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("Actual123", "hash-anterior")).thenReturn(true);
        when(passwordEncoder.matches("Nueva123", "hash-anterior")).thenReturn(false);
        when(passwordEncoder.encode("Nueva123")).thenReturn("hash-nuevo");

        perfilService.cambiarPassword(17L, new CambiarPasswordRequest("Actual123", "Nueva123"));

        assertEquals(3, usuario.getTokenVersion());
        assertEquals("hash-nuevo", usuario.getPasswordHash());
        verify(usuarioRepository).save(any(Usuario.class));
        // El refresh token es de larga duracion: sin revoked, seguiria renovando la sesion.
        verify(sesionService).revocarTodas(17L);
    }

    @Test
    void actualizarGuardaOcultarMontosCuandoVieneEnElRequest() {
        Usuario usuario = Usuario.builder()
                .id(17L)
                .email("ana@example.com")
                .nombre("Ana")
                .ocultarMontos(false)
                .build();
        when(usuarioRepository.findById(17L)).thenReturn(Optional.of(usuario));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));

        PerfilResponse response = perfilService.actualizar(17L, new PerfilActualizarRequest(
                "Ana", "ana@example.com", "CLARO", "MXN", null, null, true));

        assertTrue(usuario.isOcultarMontos());
        assertTrue(response.ocultarMontos());
    }

    @Test
    void actualizarNoApagaOcultarMontosCuandoElRequestLoOmite() {
        Usuario usuario = Usuario.builder()
                .id(17L)
                .email("ana@example.com")
                .nombre("Ana")
                .ocultarMontos(true)
                .build();
        when(usuarioRepository.findById(17L)).thenReturn(Optional.of(usuario));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));

        PerfilResponse response = perfilService.actualizar(17L, new PerfilActualizarRequest(
                "Ana", "ana@example.com", "CLARO", "MXN", null, null, null));

        assertTrue(usuario.isOcultarMontos(), "omitir la preferencia no debe apagarla");
        assertTrue(response.ocultarMontos());
    }
}
