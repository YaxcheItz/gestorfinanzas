package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.SuscripcionPushRequest;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.RolUsuario;
import com.gestionfinanzas.repository.SuscripcionNotificacionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.bouncycastle.asn1.sec.SECNamedCurves;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PushSeguridadIntegrationTest {
    @Autowired PushNotificationService push;
    @Autowired SuscripcionNotificacionRepository suscripciones;
    @Autowired UsuarioRepository usuarios;
    Long ana;
    Long bob;
    private static final String PUBLICA = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(SECNamedCurves.getByName("secp256r1").getG().getEncoded(false));
    private static final String AUTH = Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[16]);

    @BeforeEach void preparar() {
        ana = usuario(); bob = usuario();
    }

    private Long usuario() {
        return usuarios.saveAndFlush(Usuario.builder().nombre("Push test")
                .email(UUID.randomUUID()+"@example.test").passwordHash("synthetic")
                .rol(RolUsuario.ROLE_USER).activo(true).build()).getId();
    }

    private SuscripcionPushRequest request(String endpoint) {
        return new SuscripcionPushRequest(endpoint, new SuscripcionPushRequest.ClavesPushRequest(PUBLICA, AUTH));
    }

    @Test void otroUsuarioNoPuedeApropiarseDelEndpointNiBorrarlo() {
        String endpoint = "https://fcm.googleapis.com/fcm/send/"+UUID.randomUUID();
        push.guardarSuscripcion(ana, request(endpoint));
        var error = assertThrows(ResponseStatusException.class, () -> push.guardarSuscripcion(bob, request(endpoint)));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        push.eliminarSuscripcion(bob, endpoint);
        assertEquals(ana, suscripciones.findByEndpoint(endpoint).orElseThrow().getUsuario().getId());
        push.eliminarSuscripcion(ana, endpoint);
        assertTrue(suscripciones.findByEndpoint(endpoint).isEmpty());
    }

    @Test void permiteActualizarClavesPropiasSinDuplicarDispositivo() {
        String endpoint = "https://fcm.googleapis.com/fcm/send/"+UUID.randomUUID();
        push.guardarSuscripcion(ana, request(endpoint));
        String nuevaAuth = Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[]{1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16});
        push.guardarSuscripcion(ana, new SuscripcionPushRequest(endpoint,
                new SuscripcionPushRequest.ClavesPushRequest(PUBLICA,nuevaAuth)));
        assertEquals(1, suscripciones.countByUsuarioId(ana));
        assertEquals(nuevaAuth,suscripciones.findByEndpoint(endpoint).orElseThrow().getSecretoAuth());
    }

    @Test void limitaAltasPeroPermiteRenovarAlAlcanzarElLimite() {
        String base = "https://fcm.googleapis.com/fcm/send/"+UUID.randomUUID()+"-";
        for(int i=0;i<20;i++) push.guardarSuscripcion(ana,request(base+i));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS,assertThrows(ResponseStatusException.class,
                ()->push.guardarSuscripcion(ana,request(base+20))).getStatusCode());
        push.guardarSuscripcion(ana,request(base+0));
        assertEquals(20,suscripciones.countByUsuarioId(ana));
    }

    @Test void rechazaDestinosAjenoAlPushCredencialesPuertoYFragmento() {
        for(String endpoint : new String[]{"https://storage.googleapis.com/private", "https://www.apple.com/private",
                "https://fcm.googleapis.com.evil.test/send", "http://fcm.googleapis.com/send",
                "https://user@fcm.googleapis.com/send", "https://fcm.googleapis.com:8443/send",
                "https://fcm.googleapis.com/send#fragment", "https://127.0.0.1/private"}) {
            assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
                    ()->push.guardarSuscripcion(ana,request(endpoint))).getStatusCode());
        }
        assertEquals(0,suscripciones.countByUsuarioId(ana));
    }

    @Test void rechazaClavesMalformadasYUnPuntoFueraDeLaCurva() {
        String endpoint = "https://fcm.googleapis.com/fcm/send/"+UUID.randomUUID();
        byte[] punto = new byte[65]; punto[0]=4;
        for(var keys : new SuscripcionPushRequest.ClavesPushRequest[]{
                new SuscripcionPushRequest.ClavesPushRequest("invalid",AUTH),
                new SuscripcionPushRequest.ClavesPushRequest(PUBLICA,"short"),
                new SuscripcionPushRequest.ClavesPushRequest(Base64.getUrlEncoder().encodeToString(punto),AUTH)}) {
            assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
                    ()->push.guardarSuscripcion(ana,new SuscripcionPushRequest(endpoint,keys))).getStatusCode());
        }
        assertEquals(0,suscripciones.countByUsuarioId(ana));
    }
}
