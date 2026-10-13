package com.gestionfinanzas.security;

import com.gestionfinanzas.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import java.time.Duration;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties="app.abuse.store=postgres")
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named="TEST_FLYWAY_ENABLED",matches="true")
class LimiteAbusoPostgresIntegrationTest {
    @Autowired LimiteAbuso limite;
    @Autowired LimiteAbusoCompartido compartido;
    @Autowired JdbcTemplate jdbc;
    @org.springframework.beans.factory.annotation.Value("${spring.jpa.properties.hibernate.default_schema}") String schema;

    @Test void laConfiguracionActivaElStoreYConservaElConsumoTrasElRechazo() {
        assertNotNull(compartido);
        String key="prueba:"+UUID.randomUUID();
        try {
            limite.comprobar(key,1,Duration.ofMinutes(1));
            assertThrows(TooManyRequestsException.class,()->limite.comprobar(key,1,Duration.ofMinutes(1)));
            assertEquals(1,jdbc.queryForObject("SELECT consumidos FROM "+schema+".limites_abuso WHERE clave=?",Integer.class,key));
        } finally {jdbc.update("DELETE FROM "+schema+".limites_abuso WHERE clave=?",key);}
    }
}
