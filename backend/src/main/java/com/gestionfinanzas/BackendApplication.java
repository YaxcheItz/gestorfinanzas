package com.gestionfinanzas;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.TimeZone;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BackendApplication {

    public static final String ZONA_HORARIA = "America/Mexico_City";

    /**
     * Debe ejecutarse al cargar la clase, antes de que Spring/Hibernate/JDBC
     * inicialicen conversiones de fechas. Un {@code @PostConstruct} es demasiado
     * tarde: Hibernate puede haber capturado UTC y luego leer/escribir {@code LocalDate}
     * con la zona de Mexico, desplazando el dia civil (p. ej. 2025-01-30 -> 2025-01-29).
     */
    static {
        configurarZonaHoraria();
    }

    public static void main(String[] args) {
        boolean entornoE2E = Boolean.parseBoolean(System.getenv("FINANZAS_E2E"));
        boolean perfilDePruebas = "test".equals(System.getenv("SPRING_PROFILES_ACTIVE"))
                || "test".equals(System.getProperty("spring.profiles.active"))
                || java.util.Arrays.stream(args)
                        .filter(argumento -> argumento.startsWith("--spring.profiles.active="))
                        .flatMap(argumento -> java.util.Arrays.stream(argumento.substring(
                                "--spring.profiles.active=".length()).split(",")))
                        .anyMatch("test"::equals);
        if (entornoE2E) {
            String url = System.getenv("SPRING_DATASOURCE_URL");
            if (url == null || !url.startsWith("jdbc:h2:")) {
                throw new IllegalStateException("El entorno E2E requiere una base H2 aislada.");
            }
        }
        if (!entornoE2E && !perfilDePruebas) {
            cargarVariablesEnv();
        }
        SpringApplication.run(BackendApplication.class, args);
    }

    /**
     * La JVM arranca en UTC (Render y GitHub Actions usan UTC), pero la app opera en horario
     * de Ciudad de Mexico. El atributo {@code zone} de {@code @Scheduled} solo define cuando
     * se dispara la alarma, no la fecha que devuelve {@code LocalDate.now()} dentro del metodo.
     * Sin esto, entre las 18:00 y las 24:00 en Mexico la app ya cree que es el dia siguiente
     * y los recordatorios de fecha de corte y fecha limite de pago se evaluan con el dia equivocado.
     */
    public static void configurarZonaHoraria() {
        TimeZone.setDefault(TimeZone.getTimeZone(ZONA_HORARIA));
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
