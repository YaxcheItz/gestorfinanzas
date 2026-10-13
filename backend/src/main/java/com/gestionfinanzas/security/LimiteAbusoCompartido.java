package com.gestionfinanzas.security;

import com.gestionfinanzas.exception.LimiteNoDisponibleException;
import com.gestionfinanzas.exception.TooManyRequestsException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import java.time.Duration;

/** PostgreSQL decide la ventana y consume el presupuesto en una única sentencia atómica. */
@Component
@ConditionalOnProperty(name="app.abuse.store", havingValue="postgres")
public class LimiteAbusoCompartido {
    private final JdbcTemplate jdbc;
    private final String tabla;

    public LimiteAbusoCompartido(JdbcTemplate jdbc,
            @Value("${spring.jpa.properties.hibernate.default_schema:finanzas}") String schema) {
        if (!schema.matches("[a-zA-Z_][a-zA-Z0-9_]{0,62}"))
            throw new IllegalArgumentException("Esquema inválido para límites compartidos");
        this.jdbc=jdbc;
        this.tabla="\""+schema+"\".limites_abuso";
    }

    @Transactional(propagation=Propagation.REQUIRES_NEW)
    public void comprobar(String clave, int maximo, Duration duracion) {
        if (clave == null || clave.length()>240 || maximo<1 || maximo==Integer.MAX_VALUE || duracion.toSeconds()<1)
            throw new IllegalArgumentException("Ventana de límite inválida");
        String sql="""
            INSERT INTO %s AS ventana (clave,hasta,consumidos)
            VALUES (?,statement_timestamp()+make_interval(secs => ?),1)
            ON CONFLICT (clave) DO UPDATE SET
                consumidos=CASE WHEN ventana.hasta<=statement_timestamp() THEN 1
                    ELSE LEAST(ventana.consumidos+1,?) END,
                hasta=CASE WHEN ventana.hasta<=statement_timestamp()
                    THEN statement_timestamp()+make_interval(secs => ?) ELSE ventana.hasta END
            RETURNING consumidos,GREATEST(1,CEIL(EXTRACT(EPOCH FROM hasta-statement_timestamp()))) AS espera
            """.formatted(tabla);
        try {
            jdbc.query(sql,rs->{
                if (!rs.next()) throw new LimiteNoDisponibleException();
                if (rs.getInt("consumidos")>maximo)
                    throw new TooManyRequestsException("Demasiadas solicitudes. Espera antes de reintentar.",rs.getLong("espera"));
                return null;
            },clave,duracion.toSeconds(),maximo+1,duracion.toSeconds());
        } catch (DataAccessException error) {
            // Nunca cambiar a memoria al fallar la base: multiplicaría el presupuesto por instancia.
            throw new LimiteNoDisponibleException();
        }
    }

    @Scheduled(fixedDelay=60000)
    public void eliminarVencidos() {
        jdbc.update("DELETE FROM "+tabla+" WHERE hasta<=statement_timestamp()");
    }
}
