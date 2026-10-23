package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestionfinanzas.dto.request.AutomatizacionAndroidRequest.*;
import com.gestionfinanzas.model.entity.*;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** Opt-in phone fixture. Always ephemeral H2; never reads the production database configuration. */
@EnabledIfSystemProperty(named="kaptal.device.http",matches="true")
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.DEFINED_PORT,properties={
    "server.port=18081","server.address=127.0.0.1",
    "spring.datasource.url=jdbc:h2:mem:android_device_qa;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.datasource.driver-class-name=org.h2.Driver","spring.datasource.username=sa","spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop","spring.jpa.properties.hibernate.default_schema=PUBLIC",
    "spring.flyway.enabled=false","app.abuse.store=memory"})
@ActiveProfiles("test")
class AndroidDeviceHttpFixtureTest {
    @Autowired UsuarioRepository usuarios;
    @Autowired CuentaRepository cuentas;
    @Autowired TransaccionRepository movimientos;
    @Autowired ListaService listas;
    @Autowired AutomatizacionAndroidService service;
    @Autowired ObjectMapper mapper;

    @Test void phoneRegistersExactlyOnePurchaseOverHttp() throws Exception {
        var usuario=usuarios.saveAndFlush(Usuario.builder().nombre("Android HTTP QA")
            .email(UUID.randomUUID()+"@example.test").passwordHash("synthetic").build());
        var cuenta=cuentas.saveAndFlush(Cuenta.builder().usuario(usuario).nombre("Credito HTTP QA")
            .tipo(TipoCuenta.CREDITO).moneda("MXN").saldoActual(BigDecimal.ZERO).build());
        var regla=new Regla(UUID.randomUUID(),"SEARS","com.google.android.apps.messaging","12345","1234",
            cuenta.getId(),listas.personal(usuario.getId()).getId(),null);
        var credencial=service.configurar(usuario.getId(),new Configuracion(UUID.randomUUID(),true,List.of(regla)));
        Path directory=Path.of("..",".local").toAbsolutePath().normalize(); Files.createDirectories(directory);
        Path fixture=directory.resolve("android-auto-http-fixture.private.json"), done=directory.resolve("android-auto-http.done");
        Files.deleteIfExists(done);
        try {
            Files.writeString(fixture,mapper.writeValueAsString(Map.of("key",credencial.clave(),"rule",regla.id())));
            Instant deadline=Instant.now().plusSeconds(240);
            while(!Files.exists(done)&&Instant.now().isBefore(deadline)) Thread.sleep(200);
            assertTrue(Files.exists(done),"Phone fixture timed out");
            assertEquals(new BigDecimal("-25.10"),cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
            assertEquals(1,movimientos.findByUsuarioIdOrderByFechaDesc(usuario.getId(),org.springframework.data.domain.PageRequest.of(0,10)).getTotalElements());
        } finally { Files.deleteIfExists(fixture); Files.deleteIfExists(done); }
    }
}
