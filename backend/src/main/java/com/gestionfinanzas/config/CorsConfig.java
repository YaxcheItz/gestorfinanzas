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
        List<String> patterns = new java.util.ArrayList<>(List.of(
                "http://localhost:[*]",
                "https://localhost:[*]",
                "http://127.0.0.1:[*]",
                "https://127.0.0.1:[*]",
                "http://192.168.*:[*]",
                "https://192.168.*:[*]",
                "http://10.*:[*]",
                "https://10.*:[*]",
                "http://172.*:[*]",
                "https://172.*:[*]",
                "https://*.vercel.app",
                "https://*.onrender.com"
        ));
        for (String origin : origins) {
            if (!patterns.contains(origin)) {
                patterns.add(origin);
            }
        }
        configuration.setAllowedOriginPatterns(patterns);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-Requested-With",
                FiltroCsrfSesion.CABECERA, "Idempotency-Key", "Origin"));
        configuration.setExposedHeaders(List.of("Authorization", "Content-Disposition"));
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
            return List.of("http://localhost:4200");
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
    }
}
