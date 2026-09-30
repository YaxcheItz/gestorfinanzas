package com.gestionfinanzas.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * El esquema que hay hoy en producción todavía tiene `transacciones.cuenta_id` como NOT NULL,
 * algo que el código ya no espera desde que las cuentas borradas conservan su historial.
 *
 * H2 reconstruye el esquema desde las entidades, que ya declaran la columna opcional, así que
 * nunca reproduce ese desfase solo. Estos tests lo fuerzan a propósito: sin dejar la columna en
 * NOT NULL, la migración no tendría nada que hacer y el arreglo pasaría inadvertido.
 *
 * No se crean datos de dominio porque el DDL de H2 confirma la transacción en curso, y eso
 * rompería el aislamiento con el que los demás tests descartan sus datos.
 */
@SpringBootTest
@ActiveProfiles("test")
class MigracionTransaccionesCuentaOpcionalIntegrationTest {

    @Autowired private JdbcTemplate jdbcTemplate;

    @Test
    void vuelvePermitibleLaCuentaQueEstabaObligatoria() {
        dejarCuentaObligatoria();
        assertEquals("NO", nullabilidadDeCuenta(), "el punto de partida es el esquema de produccion");

        correrMigracion();

        assertEquals("YES", nullabilidadDeCuenta());
    }

    @Test
    void noHaceNadaSiLaColumnaYaEsPermitible() {
        correrMigracion();

        assertEquals("YES", nullabilidadDeCuenta());
    }

    @Test
    void aguantaQueLePasenUnEsquemaConComillasSinEjecutarSqlInyectado() {
        // El esquema viene de una variable de entorno y se concatena en el DDL, así que un valor
        // manipulado debe descartarse, no ejecutarse.
        new MigracionTransaccionesCuentaOpcional(jdbcTemplate, "publico; DROP TABLE transacciones --")
                .run(null);

        assertEquals("YES", nullabilidadDeCuenta(), "la tabla sigue existiendo");
    }

    private void correrMigracion() {
        new MigracionTransaccionesCuentaOpcional(jdbcTemplate, "PUBLIC").run(null);
    }

    private void dejarCuentaObligatoria() {
        jdbcTemplate.execute("ALTER TABLE transacciones ALTER COLUMN cuenta_id SET NOT NULL");
    }

    private String nullabilidadDeCuenta() {
        return jdbcTemplate.queryForObject(
                "SELECT is_nullable FROM information_schema.columns "
                        + "WHERE table_name = 'transacciones' AND column_name = 'cuenta_id' "
                        + "AND UPPER(table_schema) = 'PUBLIC'",
                String.class);
    }
}
