package com.gestionfinanzas.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins:http://localhost:4200}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        List<String> origins = parseOrigins(allowedOrigins);
        // Cookies de sesión solo para orígenes explícitos. Un dominio ajeno de
        // Vercel/Render no debe poder realizar llamadas con credenciales.
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedOriginPatterns(List.of());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-Requested-With",
                FiltroCsrfSesion.CABECERA, "Idempotency-Key", "Origin"));
        configuration.setExposedHeaders(List.of("Authorization", "Content-Disposition", "Retry-After"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Un valor vacio o en blanco no puede convertirse en origen: "".split(",")
     * produce [""], que no coincide con ningun origen real y rechazaria toda
     * peticion del navegador. Se cae al origen de desarrollo en su lugar.
     */
    private List<String> parseOrigins(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of(
                    "http://localhost:4200",
                    "http://localhost:4300",
                    "http://localhost:14200",
                    "http://127.0.0.1:4200",
                    "http://127.0.0.1:4300",
                    "http://127.0.0.1:14200",
                    "https://kaptalgf.vercel.app"
            );
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
    }
}
