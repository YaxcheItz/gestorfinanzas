package com.gestionfinanzas.security;

import com.gestionfinanzas.exception.TooManyRequestsException;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named="TEST_FLYWAY_ENABLED",matches="true")
class LimiteAbusoPostgresTest {
    @Test void dosInstanciasCompartenPresupuestoAtomicoYExpiracion() throws Exception {
        String url=System.getenv("TEST_DATABASE_URL");
        assertTrue(url.matches("jdbc:postgresql://(localhost|127\\.0\\.0\\.1):[0-9]+/kaptal_[a-z0-9_]+_(test|e2e)"));
        var dataSource=new DriverManagerDataSource(url,System.getenv("TEST_DATABASE_USERNAME"),System.getenv("TEST_DATABASE_PASSWORD"));
        var jdbc=new JdbcTemplate(dataSource);
        String schema="lim_"+UUID.randomUUID().toString().replace("-","");
        try {
            Flyway.configure().dataSource(dataSource).schemas(schema).defaultSchema(schema)
                    .locations("classpath:db/migration").cleanDisabled(true).load().migrate();
            var first=new LimiteAbusoCompartido(jdbc,schema);
            var second=new LimiteAbusoCompartido(new JdbcTemplate(dataSource),schema);
            try (var pool=Executors.newFixedThreadPool(8)) {
                var results=new java.util.ArrayList<java.util.concurrent.Future<Boolean>>();
                for(int i=0;i<40;i++) {
                    var store=i%2==0?first:second;
                    results.add(pool.submit(()->{
                        try {store.comprobar("usuario:1",5,Duration.ofMinutes(1));return true;}
                        catch(TooManyRequestsException error){return false;}
                    }));
                }
                int accepted=0;
                for(var result:results)if(result.get(20,TimeUnit.SECONDS))accepted++;
                assertEquals(5,accepted);
            }
            var denied=assertThrows(TooManyRequestsException.class,()->second.comprobar("usuario:1",5,Duration.ofMinutes(1)));
            assertTrue(denied.retryAfterSeconds()>0 && denied.retryAfterSeconds()<=60);
            assertDoesNotThrow(()->second.comprobar("usuario:2",5,Duration.ofMinutes(1)));
            jdbc.update("UPDATE "+schema+".limites_abuso SET hasta=statement_timestamp()-interval '1 second' WHERE clave=?","usuario:1");
            assertDoesNotThrow(()->first.comprobar("usuario:1",5,Duration.ofMinutes(1)));
            jdbc.update("UPDATE "+schema+".limites_abuso SET hasta=statement_timestamp()-interval '1 second'");
            first.eliminarVencidos();
            assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM "+schema+".limites_abuso",Integer.class));
        } finally {jdbc.execute("DROP SCHEMA IF EXISTS "+schema+" CASCADE");}
    }
}
