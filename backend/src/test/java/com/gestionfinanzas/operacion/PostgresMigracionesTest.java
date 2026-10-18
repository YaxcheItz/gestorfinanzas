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

    @Test void actualizacionV1AV8ConservaDatosYEsRepetible() throws Exception {
        String schema = "mig_" + UUID.randomUUID().toString().replace("-", "");
        try (var c = conectar(); var sql = c.createStatement()) {
            var base = flyway(schema, "1", "classpath:db/migration");
            base.migrate();
            sql.execute("INSERT INTO " + schema + ".usuarios(nombre,email,password_hash,rol,activo) "
                    + "VALUES('Prueba','mig@example.test','hash-sintetico','ROLE_USER',true)");
            var actual = flyway(schema, "latest", "classpath:db/migration");
            assertEquals(7, actual.migrate().migrationsExecuted);
            assertEquals(0, actual.migrate().migrationsExecuted);
            actual.validate();
            try (var rows = sql.executeQuery("SELECT count(*) FROM " + schema + ".usuarios")) {
                rows.next(); assertEquals(1, rows.getInt(1));
            }
            try (var rows = sql.executeQuery("SELECT periodo_tipo, periodo_ancla, periodo_dia_inicio, periodo_dia_quincena FROM " + schema + ".usuarios")) {
                assertTrue(rows.next());
                assertEquals("MES", rows.getString(1));
                assertEquals(java.time.LocalDate.of(2026, 1, 5), rows.getDate(2).toLocalDate());
                assertEquals(1, rows.getInt(3));
                assertEquals(16, rows.getInt(4));
            }
            assertThrows(java.sql.SQLException.class, () -> sql.executeUpdate("UPDATE " + schema + ".usuarios SET periodo_dia_inicio=0"));
            sql.executeUpdate("UPDATE " + schema + ".usuarios SET periodo_dia_inicio=31");
            assertEquals(0, actual.migrate().migrationsExecuted);
            try (var rows = sql.executeQuery("SELECT periodo_dia_inicio FROM " + schema + ".usuarios")) {
                assertTrue(rows.next()); assertEquals(31, rows.getInt(1));
            }
            assertEquals("8", actual.info().current().getVersion().getVersion());
            try (var rows = sql.executeQuery("SELECT count(*) FROM " + schema + ".vinculaciones_canal")) {
                assertTrue(rows.next()); assertEquals(0, rows.getInt(1));
            }
        } finally {
            eliminarEsquema(schema);
        }
    }

    @Test void v5AsignaPersonalSinCambiarImportesPropietariosNiRecurrencias() throws Exception {
        String schema = "mig_" + UUID.randomUUID().toString().replace("-", "");
        try (var c = conectar(); var sql = c.createStatement()) {
            flyway(schema, "4", "classpath:db/migration").migrate();
            sql.execute("SET search_path TO " + schema);
            sql.execute("INSERT INTO usuarios(id,nombre,email,password_hash,rol,activo) VALUES(1,'Ana','v5@example.test','hash','ROLE_USER',true)");
            sql.execute("INSERT INTO cuentas(id,usuario_id,nombre,tipo,moneda,saldo_actual,activo) VALUES(1,1,'Banco','DEBITO','MXN',975.50,true)");
            sql.execute("INSERT INTO transacciones(id,usuario_id,cuenta_id,tipo,monto,fecha,descripcion) VALUES(1,1,1,'GASTO',24.50,'2026-10-01','Comida')");
            sql.execute("INSERT INTO plantillas_recurrentes(id,usuario_id,cuenta_id,tipo,monto,siguiente_fecha,frecuencia,activa) VALUES(1,1,1,'GASTO',24.50,'2026-11-01','MENSUAL',true)");
            flyway(schema,"latest","classpath:db/migration").migrate();
            try(var rows=sql.executeQuery("SELECT t.monto,t.usuario_id,c.saldo_actual,l.clave,m.rol,p.lista_id=t.lista_id FROM transacciones t JOIN cuentas c ON c.id=t.cuenta_id JOIN listas_financieras l ON l.id=t.lista_id JOIN lista_miembros m ON m.lista_id=l.id JOIN plantillas_recurrentes p ON p.id=1")) {
                assertTrue(rows.next());assertEquals(new java.math.BigDecimal("24.50"),rows.getBigDecimal(1));
                assertEquals(1L,rows.getLong(2));assertEquals(new java.math.BigDecimal("975.50"),rows.getBigDecimal(3));
                assertEquals("PERSONAL",rows.getString(4));assertEquals("PROPIETARIO",rows.getString(5));assertTrue(rows.getBoolean(6));
                assertFalse(rows.next());
            }
        } finally {eliminarEsquema(schema);}
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
            Files.writeString(directorio.resolve("V9__fallo_controlado.sql"),
                    "CREATE TABLE \"${flyway:defaultSchema}\".no_debe_existir(id bigint); SELECT 1/0;");
            assertThrows(org.flywaydb.core.api.FlywayException.class,
                    () -> flyway(schema, "latest", "classpath:db/migration", "filesystem:" + directorio).migrate());
            try (var rows = sql.executeQuery("SELECT to_regclass('" + schema + ".no_debe_existir')")) {
                rows.next(); assertNull(rows.getString(1));
            }
            assertEquals("8", flyway(schema, "latest", "classpath:db/migration").info().current().getVersion().getVersion());
            Files.delete(directorio.resolve("V9__fallo_controlado.sql"));
            for (String archivo : new String[]{"V1__base_etapas_1_3.sql", "V2__chat_offline_y_cuenta_opcional.sql", "V3__limites_abuso_compartidos.sql", "V4__periodo_predeterminado.sql", "V5__listas_y_etiquetas.sql", "V6__presupuestos_y_recurrencias.sql", "V7__bandeja_avisos.sql", "V8__vinculacion_canal.sql"}) {
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
