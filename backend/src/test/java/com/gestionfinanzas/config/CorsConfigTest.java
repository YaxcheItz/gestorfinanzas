package com.gestionfinanzas.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CorsConfig")
class CorsConfigTest {

    private CorsConfig corsConfig;

    @BeforeEach
    void setUp() {
        corsConfig = new CorsConfig();
    }

    private CorsConfiguration buildWith(String allowedOrigins) {
        ReflectionTestUtils.setField(corsConfig, "allowedOrigins", allowedOrigins);
        CorsConfigurationSource source = corsConfig.corsConfigurationSource();
        return source.getCorsConfiguration(new org.springframework.mock.web.MockHttpServletRequest("OPTIONS", "/api/auth/login"));
    }

    @Test
    @DisplayName("acepta varios origenes separados por coma, ignorando espacios")
    void acceptsCommaSeparatedOrigins() {
        CorsConfiguration configuration = buildWith(
                "https://kaptal.example, https://otro.example");

        assertThat(configuration.checkOrigin("https://kaptal.example")).isEqualTo("https://kaptal.example");
        assertThat(configuration.checkOrigin("https://otro.example")).isEqualTo("https://otro.example");
        assertThat(configuration.checkOrigin("https://no-autorizado.example")).isNull();
    }

    @Test
    @DisplayName("un valor vacio cae al origen de desarrollo en vez de rechazar todo")
    void emptyValueFallsBackInsteadOfRejectingEverything() {
        CorsConfiguration configuration = buildWith("");

        assertThat(configuration.checkOrigin("http://localhost:4200")).isEqualTo("http://localhost:4200");
    }

    @Test
    @DisplayName("un valor con solo espacios se trata como vacio")
    void blankValueFallsBack() {
        CorsConfiguration configuration = buildWith("   ");

        assertThat(configuration.checkOrigin("http://localhost:4200")).isEqualTo("http://localhost:4200");
    }

    @Test
    @DisplayName("un valor null se trata como vacio")
    void nullValueFallsBack() {
        CorsConfiguration configuration = buildWith(null);

        assertThat(configuration.checkOrigin("http://localhost:4200")).isEqualTo("http://localhost:4200");
    }

    @Test
    @DisplayName("descarta entradas vacias entre comas")
    void discardsEmptyEntriesBetweenCommas() {
        CorsConfiguration configuration = buildWith("https://kaptalgf.vercel.app,,");

        assertThat(configuration.checkOrigin("https://kaptalgf.vercel.app")).isEqualTo("https://kaptalgf.vercel.app");
        assertThat(configuration.getAllowedOriginPatterns()).doesNotContain("");
    }
}
