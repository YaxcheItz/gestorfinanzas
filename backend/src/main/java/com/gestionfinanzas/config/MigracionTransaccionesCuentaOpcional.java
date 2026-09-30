package com.gestionfinanzas.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Corrige el desfase que dejó `ddl-auto: update` en la base de datos de producción.
 *
 * Al agregar el historial de cuentas eliminadas, `Transaccion.cuenta` pasó a ser opcional en el
 * código: al borrar una cuenta, sus movimientos se le sueltan y conservan el nombre en
 * `cuenta_nombre_historico`. Pero `ddl-auto: update` solo crea tablas nuevas, nunca altera
 * columnas que ya existen, así que en la base real `transacciones.cuenta_id` seguía con su
 * `NOT NULL` original. Resultado: borrar una cuenta fallaba con
 *
 *   null value in column "cuenta_id" of relation "transacciones" violates not-null constraint
 *
 * que el usuario veía como "choca con información ya existente". En H2 no se reproducía porque
 * los tests reconstruyen el esquema desde las entidades, que ya lo declaran opcional.
 *
 * Se ejecuta al arrancar y es idempotente: primero consulta si la columna sigue siendo
 * obligatoria y solo entonces la altera. Si algo falla, avisa y deja seguir el arranque, porque
 * una migración no debe impedir que la aplicación levante.
 */
@Slf4j
@Component
public class MigracionTransaccionesCuentaOpcional implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;
    private final String esquema;

    public MigracionTransaccionesCuentaOpcional(
            JdbcTemplate jdbcTemplate,
            @Value("${spring.jpa.properties.hibernate.default_schema:}") String esquema) {
        this.jdbcTemplate = jdbcTemplate;
        this.esquema = normalizar(esquema);
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            if (!esForzosa()) {
                return;
            }
            jdbcTemplate.execute("ALTER TABLE " + tablaCalificada()
                    + " ALTER COLUMN cuenta_id DROP NOT NULL");
            log.warn("Corregido: transacciones.cuenta_id ya puede quedar nula, como exige el "
                    + "historial de cuentas eliminadas.");
        } catch (RuntimeException error) {
            log.warn("No se pudo verificar transacciones.cuenta_id. Si al borrar una cuenta sigue "
                    + "apareciendo un conflicto de integridad, ejecuta a mano: {}", error.getMessage());
        }
    }

    private boolean esForzosa() {
        // UPPER en la comparación porque el nombre del esquema no siempre llega con el mismo
        // caso con el que está guardado: H2 baja los identificadores y PostgreSQL también.
        String consulta = "SELECT is_nullable FROM information_schema.columns WHERE table_name = "
                + "'transacciones' AND column_name = 'cuenta_id'"
                + (esquema.isEmpty() ? "" : " AND UPPER(table_schema) = UPPER(?)");
        List<String> resultado = esquema.isEmpty()
                ? jdbcTemplate.queryForList(consulta, String.class)
                : jdbcTemplate.queryForList(consulta, String.class, esquema);
        return !resultado.isEmpty() && "NO".equalsIgnoreCase(resultado.get(0));
    }

    /**
     * El esquema viene de una variable de entorno, pero se concatena en el DDL, así que se
     * valida antes: sin esto, un valor con comillas pasaría al SQL.
     */
    private String normalizar(String valor) {
        if (valor == null) {
            return "";
        }
        String limpio = valor.trim();
        if (limpio.isEmpty() || !limpio.matches("[A-Za-z_][A-Za-z0-9_]*")) {
            return "";
        }
        return limpio;
    }

    private String tablaCalificada() {
        return esquema.isEmpty() ? "transacciones" : esquema + ".transacciones";
    }
}
