package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestionfinanzas.model.entity.*;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** Isolated interactive UI fixture. Never reads a production datasource or existing QA credentials. */
@EnabledIfSystemProperty(named="kaptal.device.configuration", matches="true")
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.DEFINED_PORT, properties={
    "server.port=18082", "server.address=127.0.0.1",
    "spring.datasource.url=jdbc:h2:mem:android_configuration_qa;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.properties.hibernate.default_schema=PUBLIC",
    "spring.flyway.enabled=false", "app.abuse.store=memory"})
@ActiveProfiles("test")
class AndroidConfigurationFixtureTest {
    @Autowired UsuarioRepository usuarios;
    @Autowired CuentaRepository cuentas;
    @Autowired TransaccionRepository movimientos;
    @Autowired ConexionAndroidRepository conexiones;
    @Autowired ListaService listas;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper mapper;

    @Test void interactiveConfigurationLeavesNoConnectionOrFinancialMovement() throws Exception {
        String password = UUID.randomUUID() + "Aa1!";
        var user = usuarios.saveAndFlush(Usuario.builder().nombre("Configuracion Android QA")
            .email("android-config-" + UUID.randomUUID() + "@example.test")
            .passwordHash(passwords.encode(password)).build());
        for (String name : List.of("Santander", "American Express", "BBVA", "Sears Visa", "Revolut")) {
            cuentas.saveAndFlush(Cuenta.builder().usuario(user).nombre(name + " QA")
                .tipo(name.equals("Revolut") ? TipoCuenta.DEBITO : TipoCuenta.CREDITO)
                .moneda("MXN").saldoActual(BigDecimal.ZERO).build());
        }
        listas.personal(user.getId());
        Path directory = Path.of("..", ".local").toAbsolutePath().normalize();
        Files.createDirectories(directory);
        Path fixture = directory.resolve("android-configuration.private.json");
        Path done = directory.resolve("android-configuration.done");
        Files.deleteIfExists(done);
        try {
            Files.writeString(fixture, mapper.writeValueAsString(Map.of("email", user.getEmail(), "password", password)));
            Instant deadline = Instant.now().plusSeconds(1200);
            while (!Files.exists(done) && Instant.now().isBefore(deadline)) Thread.sleep(250);
            assertTrue(Files.exists(done), "Interactive fixture timed out");
            assertEquals(0, conexiones.countByUsuarioId(user.getId()));
            assertEquals(0, movimientos.findByUsuarioIdOrderByFechaDesc(user.getId(), org.springframework.data.domain.PageRequest.of(0, 10)).getTotalElements());
        } finally { Files.deleteIfExists(fixture); Files.deleteIfExists(done); }
    }
}
