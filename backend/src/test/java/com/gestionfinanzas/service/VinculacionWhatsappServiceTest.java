package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.response.PinVinculacionWhatsappResponse;
import com.gestionfinanzas.dto.response.VerificarPinWhatsappResponse;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class VinculacionWhatsappServiceTest {

    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final VinculacionWhatsappService service = new VinculacionWhatsappService(usuarioRepository, passwordEncoder);
    private final Usuario usuario = Usuario.builder().id(7L).telefono("5219515791240").build();

    @BeforeEach
    void configurar() {
        ReflectionTestUtils.setField(service, "numeroBot", "5219515791240");
        ReflectionTestUtils.setField(service, "tokenBot", "s".repeat(40));
    }

    @Test
    void generaPinAleatorioConVigenciaYGuardaSoloSuHash() {
        when(usuarioRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(usuario));
        when(usuarioRepository.findByWhatsappPinPhone("+5219515791240")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$stored-bcrypt-hash");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PinVinculacionWhatsappResponse response = service.generarPin(7L);

        assertTrue(response.pin().matches("\\d{6}"));
        assertEquals(600, response.vigenciaSegundos());
        assertEquals("5219515791240", response.numeroBot());
        assertEquals("$2a$stored-bcrypt-hash", usuario.getWhatsappPinHash());
        org.mockito.Mockito.verify(passwordEncoder).encode(response.pin());
    }

    @Test
    void validaElPinUnaSolaVezYDevuelveElUsuarioAlBot() {
        usuario.setWhatsappPinPhone("+5219515791240");
        usuario.setWhatsappPinHash("hash:123456");
        usuario.setWhatsappPinExpiresAt(java.time.LocalDateTime.now().plusMinutes(5));
        when(usuarioRepository.findByWhatsappPinPhoneForUpdate("+5219515791240")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("123456", "hash:123456")).thenReturn(true);
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VerificarPinWhatsappResponse response = service.verificarPin("+5219515791240", "123456");

        assertTrue(response.verificado());
        assertEquals(7L, response.usuarioId());
        assertEquals(null, usuario.getWhatsappPinHash());
    }

    @Test
    void bloqueaIntentosFallidosYEliminaElPinAlQuintoIntento() {
        usuario.setWhatsappPinPhone("+5219515791240");
        usuario.setWhatsappPinHash("hash:654321");
        usuario.setWhatsappPinIssuedAt(java.time.LocalDateTime.now().minusSeconds(10));
        usuario.setWhatsappPinExpiresAt(java.time.LocalDateTime.now().plusMinutes(5));
        when(usuarioRepository.findByWhatsappPinPhoneForUpdate("+5219515791240")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("123456", "hash:654321")).thenReturn(false);
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        for (int intento = 0; intento < 5; intento++) {
            VerificarPinWhatsappResponse response = service.verificarPin("+5219515791240", "123456");
            assertFalse(response.verificado());
        }

        assertEquals(null, usuario.getWhatsappPinHash());
        assertEquals(0, usuario.getWhatsappPinFailedAttempts());
        assertTrue(usuario.getWhatsappPinIssuedAt().isAfter(java.time.LocalDateTime.now().minusMinutes(1)));
    }

    @Test
    void limitaLaFrecuenciaDeEmisionPorUsuario() {
        usuario.setWhatsappPinIssuedAt(java.time.LocalDateTime.now().minusSeconds(5));
        when(usuarioRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(usuario));

        assertThrows(IllegalStateException.class, () -> service.generarPin(7L));
    }
}
