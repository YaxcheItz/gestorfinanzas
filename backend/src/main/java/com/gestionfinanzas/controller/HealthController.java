package com.gestionfinanzas.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final javax.sql.DataSource dataSource;

    public HealthController(javax.sql.DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> healthCheck() {
        boolean disponible;
        try (var connection = dataSource.getConnection()) {
            disponible = connection.isValid(2);
        } catch (java.sql.SQLException error) {
            disponible = false;
        }
        return ResponseEntity.status(disponible ? 200 : 503).body(Map.of(
                "status", disponible ? "UP" : "DOWN",
                "service", "Gestion Finanzas API",
                "timestamp", LocalDateTime.now()
        ));
    }
}
