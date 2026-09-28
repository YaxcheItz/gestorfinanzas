package com.gestionfinanzas.security;

import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.RolUsuario;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JwtAuthenticationFilterTest {

    private static final String SECRET = "0123456789abcdef0123456789abcdef";
    private final JwtUtil jwtUtil = new JwtUtil(SECRET, 60_000);
    private final CustomUserDetailsService userDetailsService = mock(CustomUserDetailsService.class);
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtUtil, userDetailsService);

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void aceptaTokenVigenteDelUsuarioActivo() throws Exception {
        when(userDetailsService.loadUserByUsername("ana@example.com"))
                .thenReturn(usuario(42L, 3, true));

        ejecutarFiltro(jwtUtil.generarToken("ana@example.com", 42L, 3));

        assertEquals(42L, ((CustomUserDetails) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal()).getId());
    }

    @Test
    void rechazaTokenConVersionAnteriorAlCambioDePassword() throws Exception {
        when(userDetailsService.loadUserByUsername("ana@example.com"))
                .thenReturn(usuario(42L, 4, true));

        ejecutarFiltro(jwtUtil.generarToken("ana@example.com", 42L, 3));

        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void rechazaTokensDeUsuariosDesactivadosYOtrosIds() throws Exception {
        when(userDetailsService.loadUserByUsername("ana@example.com"))
                .thenReturn(usuario(42L, 3, false));
        ejecutarFiltro(jwtUtil.generarToken("ana@example.com", 42L, 3));
        assertNull(SecurityContextHolder.getContext().getAuthentication());

        SecurityContextHolder.clearContext();
        when(userDetailsService.loadUserByUsername("ana@example.com"))
                .thenReturn(usuario(43L, 3, true));
        ejecutarFiltro(jwtUtil.generarToken("ana@example.com", 42L, 3));
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    private CustomUserDetails usuario(Long id, int version, boolean activo) {
        return new CustomUserDetails(Usuario.builder()
                .id(id)
                .email("ana@example.com")
                .passwordHash("hash")
                .rol(RolUsuario.ROLE_USER)
                .tokenVersion(version)
                .activo(activo)
                .build());
    }

    private void ejecutarFiltro(String token) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
    }
}
