package com.gestionfinanzas.config;

import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.RolUsuario;
import com.gestionfinanzas.repository.UsuarioRepository;
import com.gestionfinanzas.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Comprueba que enviar WhatsApp a un numero arbitrario y disparar la revision global de
 * recordatorios quedan restringidos a administradores. Antes bastaba cualquier sesion valida
 * para mandar mensajes a cualquier telefono o avisarle a todos los usuarios.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class NotificacionesAutorizacionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Test
    void unUsuarioNormalNoPuedeEnviarWhatsAppANumeroArbitrario() throws Exception {
        String token = tokenDe(crearUsuario("ana@example.com", RolUsuario.ROLE_USER));

        mockMvc.perform(post("/api/notificaciones/test-whatsapp")
                        .param("telefono", "5219515791240")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void unUsuarioNormalNoPuedeDispararLaRevisionGlobal() throws Exception {
        String token = tokenDe(crearUsuario("ana@example.com", RolUsuario.ROLE_USER));

        mockMvc.perform(post("/api/notificaciones/ejecutar-recordatorios")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void unUsuarioNormalSiPuedeProbarSobreSuPropioNumero() throws Exception {
        Usuario usuario = crearUsuario("ana@example.com", RolUsuario.ROLE_USER);
        String token = tokenDe(usuario);

        // No se comprueba el cuerpo: lo relevante es que la seguridad lo deje pasar y que
        // responda 400 por falta de telefono, nunca 403.
        mockMvc.perform(post("/api/notificaciones/test-mi-whatsapp")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 403) {
                        org.junit.jupiter.api.Assertions.fail("El usuario normal debe poder probar su propio numero");
                    }
                });
    }

    @Test
    void unAdministradorNoEsBloqueado() throws Exception {
        String token = tokenDe(crearUsuario("admin@example.com", RolUsuario.ROLE_ADMIN));

        mockMvc.perform(post("/api/notificaciones/test-whatsapp")
                        .param("telefono", "5219515791240")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 401 || status == 403) {
                        org.junit.jupiter.api.Assertions.fail("El administrador no deberia ser bloqueado, fue " + status);
                    }
                });
    }

    @Test
    void elTokenDeUnaCuentaEliminadaDevuelve401YNo500() throws Exception {
        // Token bien formado de una cuenta que ya no existe: es exactamente el caso de un
        // token guardado en el navegador despues de borrar la cuenta.
        String token = jwtUtil.generarToken("borrado@example.com", 999_999L, 0);

        mockMvc.perform(post("/api/notificaciones/ejecutar-recordatorios")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    private Usuario crearUsuario(String email, RolUsuario rol) {
        return usuarioRepository.saveAndFlush(Usuario.builder()
                .nombre("Usuario")
                .email(email)
                .passwordHash("hash-sin-usar")
                .rol(rol)
                .build());
    }

    private String tokenDe(Usuario usuario) {
        return jwtUtil.generarToken(usuario.getEmail(), usuario.getId(), usuario.getTokenVersion());
    }
}
