package com.gestionfinanzas.security;

import com.gestionfinanzas.exception.LimiteNoDisponibleException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import java.time.Duration;
import static org.junit.jupiter.api.Assertions.*;

class LimiteAbusoCompartidoTest {
    @Test void rechazaEsquemasQuePuedanModificarElSql() {
        assertThrows(IllegalArgumentException.class,()->new LimiteAbusoCompartido(new JdbcTemplate(),"finanzas;DROP TABLE usuarios"));
    }
    @Test void laBaseNoDisponibleNoHabilitaSolicitudesNiExponeDetalles() {
        var dataSource=new DriverManagerDataSource("jdbc:h2:mem:limite_no_disponible","sa","");
        var store=new LimiteAbusoCompartido(new JdbcTemplate(dataSource),"finanzas");
        var error=assertThrows(LimiteNoDisponibleException.class,()->store.comprobar("usuario:1",5,Duration.ofMinutes(1)));
        assertFalse(error.getMessage().contains("jdbc"));
    }
}
