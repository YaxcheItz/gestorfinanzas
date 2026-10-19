package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.repository.ConexionWhatsappRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

/** Committed transactions, not a single rollback transaction shared by both contenders. */
@SpringBootTest(properties={"whatsapp.channel.enabled=true", "whatsapp.channel.bot-phone=+15555550100",
        "whatsapp.channel.phone-number-id=12345", "whatsapp.channel.webhook-secret=synthetic-webhook-secret-at-least-32"})
@AutoConfigureMockMvc @ActiveProfiles("test")
class ConexionWhatsappConcurrenciaTest {
    @Autowired ConexionWhatsappService service;
    @Autowired ConexionWhatsappRepository conexiones;
    @Autowired UsuarioRepository usuarios;
    @Autowired ObjectMapper mapper;
    Usuario a,b;
    String phone;
    @BeforeEach void setup(){
        a=usuarios.saveAndFlush(Usuario.builder().nombre("Concurrent A").email(UUID.randomUUID()+"@example.test").passwordHash("synthetic").build());
        b=usuarios.saveAndFlush(Usuario.builder().nombre("Concurrent B").email(UUID.randomUUID()+"@example.test").passwordHash("synthetic").build());
        phone="+1555"+String.format("%010d",a.getId());
    }
    @AfterEach void cleanup(){usuarios.deleteById(a.getId());usuarios.deleteById(b.getId());}
    int verify(String code)throws Exception{
        byte[] raw=mapper.writeValueAsBytes(Map.of("phone_number_id","12345","message",Map.of("id",UUID.randomUUID().toString(),
                "from",phone,"type","text","timestamp",Long.toString(Instant.now().getEpochSecond()),
                "text",Map.of("body","vincular "+code),"kapso",Map.of("direction","inbound"))));
        Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(ConexionWhatsappIntegrationTest.SECRET.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
        try{return service.verificarEvento(raw,HexFormat.of().formatHex(mac.doFinal(raw))).verificado()?1:0;}
        catch(DataIntegrityViolationException conflict){return 409;}
    }
    List<Integer> together(Callable<Integer> first,Callable<Integer> second)throws Exception{
        var ready=new CountDownLatch(2);var start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)){
            var tasks=List.of(first,second).stream().map(task->pool.submit(()->{
                ready.countDown();assertTrue(start.await(15,TimeUnit.SECONDS));return task.call();
            })).toList();
            assertTrue(ready.await(15,TimeUnit.SECONDS));start.countDown();
            return List.of(tasks.get(0).get(20,TimeUnit.SECONDS),tasks.get(1).get(20,TimeUnit.SECONDS));
        }
    }
    @Test void mismoDesafioSeConsumeUnaSolaVezConDosProcesos()throws Exception{
        String code=service.iniciar(a.getId(),phone).codigo();
        assertEquals(List.of(0,1),together(()->verify(code),()->verify(code)).stream().sorted().toList());
        assertEquals("VERIFICADA",service.estado(a.getId()).estado());
    }
    @Test void mismoTelefonoNoQuedaActivoEnDosUsuarios()throws Exception{
        String ca=service.iniciar(a.getId(),phone).codigo(),cb=service.iniciar(b.getId(),phone).codigo();
        var results=together(()->verify(ca),()->verify(cb));
        assertEquals(1,results.stream().filter(x->x==1).count());assertTrue(results.stream().allMatch(x->Set.of(0,1,409).contains(x)));
        assertEquals(1,List.of(service.estado(a.getId()),service.estado(b.getId())).stream().filter(x->x.estado().equals("VERIFICADA")).count());
    }
    @Test void desconectarDuranteVerificacionNoResucitaLaConexion()throws Exception{
        String code=service.iniciar(a.getId(),phone).codigo();
        together(()->verify(code),()->{service.desconectar(a.getId());return 0;});
        assertEquals("DESCONECTADA",service.estado(a.getId()).estado());assertEquals(0,verify(code));
    }
}
