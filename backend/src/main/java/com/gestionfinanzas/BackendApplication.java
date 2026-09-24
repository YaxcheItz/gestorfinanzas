package com.gestionfinanzas;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@SpringBootApplication
public class BackendApplication {

    public static void main(String[] args) {
        cargarVariablesEnv();
        SpringApplication.run(BackendApplication.class, args);
    }

    private static void cargarVariablesEnv() {
        Path envPath = Path.of(".env");
        if (Files.exists(envPath)) {
            try (var lines = Files.lines(envPath)) {
                lines.map(String::trim)
                     .filter(line -> !line.isEmpty() && !line.startsWith("#") && line.contains("="))
                     .forEach(line -> {
                         int idx = line.indexOf('=');
                         String key = line.substring(0, idx).trim();
                         String value = line.substring(idx + 1).trim();

                         if (key.isEmpty()) return; // Evita el error "key can't be empty"

                         // Elimina las comillas dobles o simples si el valor las tiene
                         if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
                             value = value.substring(1, value.length() - 1);
                         }

                         // Establecemos la propiedad del sistema para que Spring la detecte
                         System.setProperty(key, value);
                     });
                System.out.println(">>> [Config] Variables de entorno cargadas exitosamente desde .env");
            } catch (IOException e) {
                System.err.println(">>> [Aviso] No se pudo leer el archivo .env: " + e.getMessage());
            }
        }
    }
}