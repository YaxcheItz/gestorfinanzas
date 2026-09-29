package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.RegistroRequest;
import com.gestionfinanzas.dto.response.AuthResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("AuthService")
class AuthServiceTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private com.gestionfinanzas.repository.UsuarioRepository usuarioRepository;

    @Autowired
    private com.gestionfinanzas.repository.CuentaRepository cuentaRepository;

    @Test
    @DisplayName("registra un usuario nuevo y siembra sus cuentas y categorias")
    void registraUsuarioNuevo() {
        AuthResponse response = authService.registrar(
                new RegistroRequest("Ana Nueva", "ana.nueva@example.com", "Prueba1234!"));

        assertThat(response.token()).isNotBlank();

        var usuario = usuarioRepository.findByEmail("ana.nueva@example.com").orElseThrow();
        assertThat(cuentaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuario.getId()))
                .extracting("nombre")
                .containsExactly("Billetera / Efectivo");
    }

    @Test
    @DisplayName("rechaza un correo ya registrado")
    void rechazaCorreoDuplicado() {
        authService.registrar(new RegistroRequest("Ana", "ana.dup@example.com", "Prueba1234!"));

        try {
            authService.registrar(new RegistroRequest("Otra", "ana.dup@example.com", "Prueba1234!"));
            org.junit.jupiter.api.Assertions.fail("debio rechazar el correo duplicado");
        } catch (IllegalArgumentException e) {
            assertThat(e.getMessage()).contains("Ya existe una cuenta registrada");
        }
    }
}
