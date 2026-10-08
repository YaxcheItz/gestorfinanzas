package com.gestionfinanzas.operacion;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Cada caso usa un esquema propio, nunca el esquema de aplicación ni datos reales. */
@EnabledIfEnvironmentVariable(named = "TEST_FLYWAY_ENABLED", matches = "true")
class PostgresMigracionesTest {
    private final String url = System.getenv("TEST_DATABASE_URL");
    private final String user = System.getenv("TEST_DATABASE_USERNAME");
    private final String password = System.getenv().getOrDefault("TEST_DATABASE_PASSWORD", "");

    private Connection conectar() throws Exception {
        assertTrue(url.matches("jdbc:postgresql://(localhost|127\\.0\\.0\\.1):[0-9]+/kaptal_[a-z0-9_]+_(test|e2e)"),
                "Las pruebas de DDL requieren una base local dedicada con sufijo _test o _e2e");
        return DriverManager.getConnection(url, user, password);
    }

    private Flyway flyway(String schema, String target, String... locations) {
        return Flyway.configure().dataSource(url, user, password).schemas(schema).defaultSchema(schema)
                .locations(locations).target(target).baselineOnMigrate(false).cleanDisabled(true).load();
    }

    @Test void actualizacionV1AV2ConservaDatosYEsRepetible() throws Exception {
        String schema = "mig_" + UUID.randomUUID().toString().replace("-", "");
        try (var c = conectar(); var sql = c.createStatement()) {
            var base = flyway(schema, "1", "classpath:db/migration");
            base.migrate();
            sql.execute("INSERT INTO " + schema + ".usuarios(nombre,email,password_hash,rol,activo) "
                    + "VALUES('Prueba','mig@example.test','hash-sintetico','ROLE_USER',true)");
            var actual = flyway(schema, "latest", "classpath:db/migration");
            assertEquals(1, actual.migrate().migrationsExecuted);
            assertEquals(0, actual.migrate().migrationsExecuted);
            actual.validate();
            try (var rows = sql.executeQuery("SELECT count(*) FROM " + schema + ".usuarios")) {
                rows.next(); assertEquals(1, rows.getInt(1));
            }
            assertEquals("2", actual.info().current().getVersion().getVersion());
        } finally {
            eliminarEsquema(schema);
        }
    }

    @Test void noAdoptaAutomaticamenteUnaBaseDesconocida() throws Exception {
        String schema = "mig_" + UUID.randomUUID().toString().replace("-", "");
        try (var c = conectar(); var sql = c.createStatement()) {
            sql.execute("CREATE SCHEMA " + schema);
            sql.execute("CREATE TABLE " + schema + ".datos_ajenos(id bigint)");
            assertThrows(org.flywaydb.core.api.FlywayException.class,
                    () -> flyway(schema, "latest", "classpath:db/migration").migrate());
        } finally {
            eliminarEsquema(schema);
        }
    }

    @Test void falloDeMigracionRevierteDDL_YChecksumImpideCambiosSilenciosos() throws Exception {
        String schema = "mig_" + UUID.randomUUID().toString().replace("-", "");
        var directorio = Files.createTempDirectory("kaptal-migracion-");
        try (var c = conectar(); var sql = c.createStatement()) {
            flyway(schema, "latest", "classpath:db/migration").migrate();
            Files.writeString(directorio.resolve("V3__fallo_controlado.sql"),
                    "CREATE TABLE \"${flyway:defaultSchema}\".no_debe_existir(id bigint); SELECT 1/0;");
            assertThrows(org.flywaydb.core.api.FlywayException.class,
                    () -> flyway(schema, "latest", "classpath:db/migration", "filesystem:" + directorio).migrate());
            try (var rows = sql.executeQuery("SELECT to_regclass('" + schema + ".no_debe_existir')")) {
                rows.next(); assertNull(rows.getString(1));
            }
            assertEquals("2", flyway(schema, "latest", "classpath:db/migration").info().current().getVersion().getVersion());
            Files.delete(directorio.resolve("V3__fallo_controlado.sql"));
            for (String archivo : new String[]{"V1__base_etapas_1_3.sql", "V2__chat_offline_y_cuenta_opcional.sql"}) {
                try (var recurso = getClass().getResourceAsStream("/db/migration/" + archivo)) {
                    assertNotNull(recurso);
                    Files.copy(recurso, directorio.resolve(archivo));
                }
            }
            Files.writeString(directorio.resolve("V2__chat_offline_y_cuenta_opcional.sql"), "SELECT 1;\n",
                    java.nio.file.StandardOpenOption.APPEND);
            assertThrows(org.flywaydb.core.api.FlywayException.class,
                    () -> flyway(schema, "latest", "filesystem:" + directorio).validate());
        } finally {
            eliminarEsquema(schema);
            try (var archivos = Files.list(directorio)) {
                for (var archivo : archivos.toList()) Files.delete(archivo);
            }
            Files.delete(directorio);
        }
    }

    private void eliminarEsquema(String schema) throws Exception {
        assertTrue(schema.matches("mig_[a-f0-9]{32}"));
        try (var c = conectar(); var sql = c.createStatement()) {
            sql.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }
}
