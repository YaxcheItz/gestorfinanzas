package com.gestionfinanzas.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import jakarta.servlet.FilterChain;

@ExtendWith(MockitoExtension.class)
@DisplayName("FiltroCsrfSesion")
class FiltroCsrfSesionTest {

    @Mock
    private FilterChain chain;

    private FiltroCsrfSesion filtro;

    @BeforeEach
    void setUp() {
        filtro = new FiltroCsrfSesion();
    }

    @Test
    @DisplayName("bloquea refresh sin la cabecera porque otra pagina podria lanzarlo con la cookie")
    void bloqueaRefreshSinCabecera() throws Exception {
        MockHttpServletResponse response = ejecutar("POST", "/api/auth/refresh", null);

        assertThat(response.getStatus()).isEqualTo(403);
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    @DisplayName("bloquea logout sin la cabecera por el mismo motivo")
    void bloqueaLogoutSinCabecera() throws Exception {
        MockHttpServletResponse response = ejecutar("POST", "/api/auth/logout", null);

        assertThat(response.getStatus()).isEqualTo(403);
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    @DisplayName("bloquea tambien una cabecera vacia, que es lo que mandaria un atacante")
    void bloqueaCabeceraVacia() throws Exception {
        MockHttpServletResponse response = ejecutar("POST", "/api/auth/refresh", "  ");

        assertThat(response.getStatus()).isEqualTo(403);
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    @DisplayName("deja pasar refresh con la cabecera")
    void dejaPasarRefreshConCabecera() throws Exception {
        MockHttpServletResponse response = ejecutar("POST", "/api/auth/refresh", "1");

        assertThat(response.getStatus()).isEqualTo(200);
        verify(chain, times(1)).doFilter(any(), any());
    }

    @Test
    @DisplayName("deja pasar logout con la cabecera")
    void dejaPasarLogoutConCabecera() throws Exception {
        MockHttpServletResponse response = ejecutar("POST", "/api/auth/logout", "1");

        assertThat(response.getStatus()).isEqualTo(200);
        verify(chain, times(1)).doFilter(any(), any());
    }

    @Test
    @DisplayName("el preflight vuela sin cabecera porque todavia no existe, y lo responde CORS")
    void dejaPasarPreflight() throws Exception {
        MockHttpServletResponse response = ejecutar("OPTIONS", "/api/auth/refresh", null);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(chain, times(1)).doFilter(any(), any());
    }

    @Test
    @DisplayName("no toca login ni registro, que ya estan protegidos por exigir cuerpo JSON")
    void noTocaLoginNiRegistro() throws Exception {
        ejecutar("POST", "/api/auth/login", null);
        ejecutar("POST", "/api/auth/registro", null);

        assertThat(chain).isNotNull();
        verify(chain, times(2)).doFilter(any(), any());
    }

    @Test
    @DisplayName("no toca el resto de la API, que autentica con cabecera y no con cookie")
    void noTocaElRestoDeLaApi() throws Exception {
        ejecutar("POST", "/api/transacciones", null);

        verify(chain, times(1)).doFilter(any(), any());
    }

    @Test
    @DisplayName("ignora otros metodos sobre las rutas protegidas")
    void ignoraOtrosMetodos() throws Exception {
        ejecutar("GET", "/api/auth/refresh", null);

        verify(chain, times(1)).doFilter(any(), any());
    }

    private MockHttpServletResponse ejecutar(String metodo, String ruta, String cabecera) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(metodo, ruta);
        request.setRequestURI(ruta);
        if (cabecera != null) {
            request.addHeader(FiltroCsrfSesion.CABECERA, cabecera);
        }
        MockHttpServletResponse response = new MockHttpServletResponse();
        filtro.doFilter(request, response, chain);
        return response;
    }
}
