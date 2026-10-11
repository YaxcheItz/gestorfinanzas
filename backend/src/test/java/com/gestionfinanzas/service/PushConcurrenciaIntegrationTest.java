package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.SuscripcionPushRequest;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.RolUsuario;
import com.gestionfinanzas.repository.SuscripcionNotificacionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.bouncycastle.asn1.sec.SECNamedCurves;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;

/** Transacciones reales separadas: los contendientes ven únicamente datos confirmados. */
@SpringBootTest
@ActiveProfiles("test")
class PushConcurrenciaIntegrationTest {
    @Autowired PushNotificationService push;
    @Autowired SuscripcionNotificacionRepository suscripciones;
    @Autowired UsuarioRepository usuarios;
    @Autowired PlatformTransactionManager manager;
    Long ana;
    Long bob;
    private static final String PUBLICA = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(SECNamedCurves.getByName("secp256r1").getG().getEncoded(false));
    private static final String AUTH = Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[16]);

    @BeforeEach void preparar() {
        var tx = new TransactionTemplate(manager);
        ana = tx.execute(status -> usuario());
        bob = tx.execute(status -> usuario());
    }

    private Long usuario() {
        return usuarios.saveAndFlush(Usuario.builder().nombre("Concurrency test")
                .email(UUID.randomUUID()+"@example.test").passwordHash("synthetic")
                .rol(RolUsuario.ROLE_USER).activo(true).build()).getId();
    }

    @AfterEach void limpiar() {
        new TransactionTemplate(manager).executeWithoutResult(status -> {
            for (Long id : List.of(ana,bob)) {
                suscripciones.deleteAllByUsuarioId(id);
                usuarios.deleteById(id);
            }
        });
    }

    private int registrar(Long usuario, String endpoint, CountDownLatch inicio) throws Exception {
        assertTrue(inicio.await(10,TimeUnit.SECONDS));
        try {
            push.guardarSuscripcion(usuario, new SuscripcionPushRequest(endpoint,
                    new SuscripcionPushRequest.ClavesPushRequest(PUBLICA,AUTH)));
            return 200;
        } catch (ResponseStatusException error) {
            return error.getStatusCode().value();
        }
    }

    @Test void dosAltasSimultaneasNoSuperanElLimite() throws Exception {
        String base="https://fcm.googleapis.com/fcm/send/"+UUID.randomUUID()+"-";
        for(int i=0;i<19;i++) push.guardarSuscripcion(ana,new SuscripcionPushRequest(base+i,
                new SuscripcionPushRequest.ClavesPushRequest(PUBLICA,AUTH)));
        var inicio=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var a=pool.submit(()->registrar(ana,base+19,inicio));
            var b=pool.submit(()->registrar(ana,base+20,inicio));
            inicio.countDown();
            assertEquals(List.of(200,429),List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS)).stream().sorted().toList());
        }
        assertEquals(20,suscripciones.countByUsuarioId(ana));
    }

    @Test void unEndpointPresentadoPorDosUsuariosConservaUnSoloPropietario() throws Exception {
        String endpoint="https://fcm.googleapis.com/fcm/send/"+UUID.randomUUID();
        var inicio=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var a=pool.submit(()->registrar(ana,endpoint,inicio));
            var b=pool.submit(()->registrar(bob,endpoint,inicio));
            inicio.countDown();
            int estadoA=a.get(15,TimeUnit.SECONDS),estadoB=b.get(15,TimeUnit.SECONDS);
            assertEquals(List.of(200,409),List.of(estadoA,estadoB).stream().sorted().toList());
            new TransactionTemplate(manager).executeWithoutResult(status ->
                assertEquals(estadoA==200?ana:bob,suscripciones.findByEndpoint(endpoint).orElseThrow().getUsuario().getId()));
        }
        assertEquals(1,suscripciones.countByUsuarioId(ana)+suscripciones.countByUsuarioId(bob));
    }
}
