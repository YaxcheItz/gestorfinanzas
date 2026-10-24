package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.RegistroRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
        SesionService.SesionEmitida response = authService.registrar(
                new RegistroRequest("Ana Nueva", "ana.nueva@example.com", "Prueba1234!"));

        assertThat(response.auth().token()).isNotBlank();
        assertThat(response.refreshToken()).isNotBlank();

        var usuario = usuarioRepository.findByEmail("ana.nueva@example.com").orElseThrow();
        assertThat(usuario.getTemaPreferido()).isEqualTo("OSCURO");
        assertThat(cuentaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuario.getId()))
                .extracting("nombre")
                .containsExactly("Billetera / Efectivo");
    }

    @Test
    @DisplayName("Google conserva preferencias existentes y crea perfiles oscuros")
    void temaGoogleNuevoYExistente() {
        authService.autenticarGoogle("nuevo-tema", "Nueva", "nueva.tema@example.com", true);
        var nuevo = usuarioRepository.findByEmail("nueva.tema@example.com").orElseThrow();
        assertThat(nuevo.getTemaPreferido()).isEqualTo("OSCURO");
        nuevo.setTemaPreferido("CLARO");
        usuarioRepository.saveAndFlush(nuevo);
        authService.autenticarGoogle("nuevo-tema", "Nueva", "nueva.tema@example.com", true);
        assertThat(usuarioRepository.findByEmail("nueva.tema@example.com").orElseThrow().getTemaPreferido())
                .isEqualTo("CLARO");
    }

    @Test
    @DisplayName("Google conserva usuario y cuentas cuando la identidad verificada no cambia")
    void googleConservaIdentidadExistente() {
        authService.autenticarGoogle("identidad-estable", "Original", "estable@example.test", true);
        var original = usuarioRepository.findByGoogleSubject("identidad-estable").orElseThrow();
        var cuentas = cuentaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(original.getId());
        long totalUsuarios = usuarioRepository.count();

        authService.autenticarGoogle("identidad-estable", "Nombre actualizado", "estable@example.test", true);

        assertThat(usuarioRepository.count()).isEqualTo(totalUsuarios);
        assertThat(usuarioRepository.findByGoogleSubject("identidad-estable").orElseThrow().getId())
                .isEqualTo(original.getId());
        assertThat(cuentaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(original.getId()))
                .extracting("id").containsExactlyElementsOf(cuentas.stream().map(c -> c.getId()).toList());
    }

    @Test
    @DisplayName("Google rechaza reemplazar una identidad vinculada aunque coincida el correo")
    void googleNoReemplazaIdentidadVinculada() {
        authService.autenticarGoogle("identidad-original", "Original", "vinculada@example.test", true);
        long totalUsuarios = usuarioRepository.count();

        assertThatThrownBy(() -> authService.autenticarGoogle(
                "identidad-distinta", "Otra", "vinculada@example.test", true))
                .isInstanceOf(org.springframework.security.authentication.BadCredentialsException.class);

        assertThat(usuarioRepository.count()).isEqualTo(totalUsuarios);
        assertThat(usuarioRepository.findByEmail("vinculada@example.test").orElseThrow().getGoogleSubject())
                .isEqualTo("identidad-original");
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
