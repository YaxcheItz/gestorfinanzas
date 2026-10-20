package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.*;
import com.gestionfinanzas.model.entity.*;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties={"whatsapp.channel.enabled=true","whatsapp.channel.runtime-enabled=true",
        "whatsapp.channel.bot-phone=+15555550100","whatsapp.channel.phone-number-id=12345",
        "whatsapp.channel.webhook-secret=synthetic-webhook-secret-at-least-32"})
@AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class WhatsappRuntimeIntegrationTest {
    static final String SECRET="synthetic-webhook-secret-at-least-32",BASE="/api/canales/whatsapp/evento";
    static final AtomicInteger numbers=new AtomicInteger(2000);
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired ConexionWhatsappService link;
    @Autowired ConexionWhatsappRepository connections;
    @Autowired UsuarioRepository users;
    @Autowired CuentaRepository accounts;
    @Autowired TransaccionRepository movements;
    @Autowired ListaService lists;
    @Autowired EntityManager em;
    Usuario a,b;String pa,pb;Cuenta bank;
    record Packet(byte[] raw,String signature,String received,String relay) {}
    @BeforeEach void setup(){
        a=users.saveAndFlush(Usuario.builder().nombre("Runtime A").email(UUID.randomUUID()+"@example.test").passwordHash("synthetic").build());
        b=users.saveAndFlush(Usuario.builder().nombre("Runtime B").email(UUID.randomUUID()+"@example.test").passwordHash("synthetic").build());
        pa="+1555555"+numbers.incrementAndGet();pb="+1555555"+numbers.incrementAndGet();
        lists.personal(a.getId());lists.personal(b.getId());
        bank=accounts.saveAndFlush(Cuenta.builder().usuario(a).nombre("Nu prueba").tipo(TipoCuenta.DEBITO).moneda("MXN").saldoActual(new BigDecimal("1000.00")).build());
        accounts.saveAndFlush(Cuenta.builder().usuario(b).nombre("Banco secreto B").tipo(TipoCuenta.DEBITO).moneda("MXN").saldoActual(new BigDecimal("9000.00")).build());
    }
    String sign(byte[] raw,String prefix)throws Exception{
        var m=Mac.getInstance("HmacSHA256");m.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));m.update(prefix.getBytes(StandardCharsets.UTF_8));return HexFormat.of().formatHex(m.doFinal(raw));
    }
    Packet packet(String phone,String text,String type,String id,long received)throws Exception{
        var kapso=new HashMap<String,Object>();kapso.put("direction","inbound");
        if(type.equals("audio"))kapso.put("transcript",Map.of("text",text));
        byte[] raw=mapper.writeValueAsBytes(Map.of("phone_number_id","12345","message",Map.of("id",id,"from",phone,"timestamp",Long.toString(Instant.now().getEpochSecond()),"type",type,"text",Map.of("body",text),"kapso",kapso)));
        String at=Long.toString(received);return new Packet(raw,sign(raw,""),at,sign(raw,"kaptal-relay-v1\n"+at+"\n"));
    }
    Packet packet(String phone,String text)throws Exception{return packet(phone,text,"text",UUID.randomUUID().toString(),System.currentTimeMillis());}
    JsonNode call(Packet p,String path)throws Exception{
        var result=mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).header("X-Webhook-Signature",p.signature()).header("X-Kaptal-Received-At",p.received()).header("X-Kaptal-Relay-Signature",p.relay()).content(p.raw())).andExpect(status().isOk()).andReturn();
        return mapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8)).path("data");
    }
    void connect(Usuario u,String phone,boolean automatic)throws Exception{
        var challenge=link.iniciar(u.getId(),phone,automatic);assertTrue(call(packet(phone,"vincular "+challenge.codigo()),BASE).path("responder").asBoolean());
        var c=connections.findByUsuarioId(u.getId()).orElseThrow();c.setVerificada(Instant.now().minusSeconds(2));connections.saveAndFlush(c);
    }
    long count(){return movements.findAllByUsuarioIdOrderByFechaAscIdAsc(a.getId()).size();}
    @Test void consultaSoloLaCuentaDelRemitenteSinSesionGeneral()throws Exception{
        connect(a,pa,true);connect(b,pb,true);
        var r=call(packet(pa,"saldo"),BASE);assertTrue(r.path("respuesta").asText().contains("1000.00"));assertFalse(r.toString().contains("9000"));
        assertTrue(call(packet(pb,"saldo"),BASE).path("respuesta").asText().contains("9000.00"));assertEquals(0,count());
    }
    @Test void remitenteDesconocidoNoRecibeDatosNiRegistra()throws Exception{
        connect(a,pa,true);assertFalse(call(packet(pb,"saldo"),BASE).path("responder").asBoolean());assertEquals(0,count());
    }
    @Test void guardaUnaVezYReintentaAcuseSinReinterpretar()throws Exception{
        connect(a,pa,true);var p=packet(pa,"Gaste 25 en tacos con Nu prueba");
        var first=call(p,BASE);assertTrue(first.path("respuesta").asText().contains("registrado"));assertEquals(1,count());
        assertEquals(first,call(p,BASE));assertEquals(1,count());assertEquals(new BigDecimal("975.00"),accounts.findById(bank.getId()).orElseThrow().getSaldoActual());
        assertTrue(call(p,BASE+"/autorizar-respuesta").asBoolean());
    }
    @Test void otraCompraIdenticaYAutoguardadoDesactivadoQuedanPendientes()throws Exception{
        connect(a,pa,true);call(packet(pa,"Gaste 25 en tacos con Nu prueba"),BASE);
        assertTrue(call(packet(pa,"Gaste 25 en tacos con Nu prueba"),BASE).path("respuesta").asText().contains("pendiente"));assertEquals(1,count());
        link.preferencias(a.getId(),false);assertTrue(call(packet(pa,"Gaste 8 en cafe con Nu prueba"),BASE).path("respuesta").asText().contains("pendiente"));assertEquals(1,count());
    }
    @Test void borradoresNoSeCompartenYCuentaDebeSerExplicita()throws Exception{
        connect(a,pa,true);connect(b,pb,true);call(packet(pa,"Gaste 25 en tacos"),BASE);assertEquals(0,count());
        call(packet(pb,"Nu prueba"),BASE);assertEquals(0,count());
        assertTrue(call(packet(pa,"Nu prueba"),BASE).path("respuesta").asText().contains("registrado"));assertEquals(1,count());
    }
    @Test void desconectarImpideRespuestaPendienteYRepeticionDeEvento()throws Exception{
        connect(a,pa,true);var p=packet(pa,"saldo");call(p,BASE);link.desconectar(a.getId());
        assertFalse(call(p,BASE+"/autorizar-respuesta").asBoolean());assertFalse(call(p,BASE).path("responder").asBoolean());
    }
    @Test void mensajeAnteriorNoSeEnrutaAlNuevoDuenoDelTelefono()throws Exception{
        connect(a,pa,true);var old=packet(pa,"Gaste 25 en tacos con Banco secreto B");link.desconectar(a.getId());connect(b,pa,true);
        var c=connections.findByUsuarioId(b.getId()).orElseThrow();c.setVerificada(Instant.ofEpochMilli(Long.parseLong(old.received())+1));connections.saveAndFlush(c);
        assertFalse(call(old,BASE).path("responder").asBoolean());assertEquals(0,movements.findAllByUsuarioIdOrderByFechaAscIdAsc(b.getId()).size());
    }
    @Test void audioSeConfirmaUnaVezYCancelarLoInvalida()throws Exception{
        connect(a,pa,true);var audio=packet(pa,"Gaste 7 en cafe con Nu prueba","audio","audio-qa",System.currentTimeMillis());
        String response=call(audio,BASE).path("respuesta").asText();assertEquals(0,count());
        String code=WhatsappEventoService.claveFinanciera(a.getId(),"whatsapp-audio","audio-qa").toString().substring(0,8);assertTrue(response.contains(code));
        call(packet(pa,"confirmar audio "+code),BASE);assertEquals(1,count());call(packet(pa,"confirmar audio "+code),BASE);assertEquals(1,count());
        call(packet(pa,"Gaste 8 en cafe con Nu prueba","audio","audio-qa2",System.currentTimeMillis()),BASE);call(packet(pa,"cancelar"),BASE);
        call(packet(pa,"confirmar audio "+WhatsappEventoService.claveFinanciera(a.getId(),"whatsapp-audio","audio-qa2").toString().substring(0,8)),BASE);assertEquals(1,count());
    }
    @Test void firmaDeKapsoNoPermiteInventarLaFechaDeRecepcion()throws Exception{
        connect(a,pa,true);var p=packet(pa,"saldo");
        mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).header("X-Webhook-Signature",p.signature()).content(p.raw())).andExpect(status().isUnauthorized());
        mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).header("X-Webhook-Signature",p.signature()).header("X-Kaptal-Received-At",Long.toString(Long.parseLong(p.received())+1)).header("X-Kaptal-Relay-Signature",p.relay()).content(p.raw())).andExpect(status().isUnauthorized());
    }
    @Test void codexNoEjecutaYClavesSonCompatiblesConElReceptorAnterior()throws Exception{
        connect(a,pa,true);assertTrue(call(packet(pa,"/codex borrar todo"),BASE).path("respuesta").asText().contains("No se ejecutan"));assertEquals(0,count());
        assertEquals(UUID.fromString("6a514198-ffa9-59ab-b4d1-cc0183038a7d"),WhatsappEventoService.claveFinanciera(7L,"whatsapp-chat","synthetic-event"));
    }
    @Test void deshacerExigeConfirmacionYSoloEliminaElMovimientoIdentificado()throws Exception{
        connect(a,pa,true);
        call(packet(pa,"Gaste 50 en gasolina con Nu prueba"),BASE);
        call(packet(pa,"Gaste 20 en tacos con Nu prueba"),BASE);
        assertEquals(2,count());
        assertEquals(new BigDecimal("930.00"),accounts.findById(bank.getId()).orElseThrow().getSaldoActual());

        var request=call(packet(pa,"deshacer"),BASE).path("respuesta").asText();
        assertTrue(request.contains("tacos"));
        assertTrue(request.contains("confirmar deshacer"));
        assertEquals(2,count());
        assertEquals(new BigDecimal("930.00"),accounts.findById(bank.getId()).orElseThrow().getSaldoActual());

        call(packet(pa,"si"),BASE);
        assertEquals(2,count());
        var undo=call(packet(pa,"confirmar deshacer"),BASE).path("respuesta").asText();
        assertTrue(undo.contains("Movimiento deshecho"));
        assertEquals(1,count());
        assertEquals(new BigDecimal("950.00"),accounts.findById(bank.getId()).orElseThrow().getSaldoActual());

        call(packet(pa,"confirmar deshacer"),BASE);
        assertEquals(1,count());
    }
    @Test void cancelarOVencerConfirmacionDeDeshacerConservaElMovimiento()throws Exception{
        connect(a,pa,true);
        call(packet(pa,"Gaste 12 en cafe con Nu prueba"),BASE);
        call(packet(pa,"deshacer"),BASE);
        call(packet(pa,"cancelar"),BASE);
        assertTrue(call(packet(pa,"confirmar deshacer"),BASE).path("respuesta").asText().contains("No hay una confirmacion pendiente"));
        assertEquals(1,count());

        call(packet(pa,"deshacer"),BASE);
        var connection=connections.findByUsuarioId(a.getId()).orElseThrow();
        connection.setContextoVence(Instant.now().minusSeconds(1));
        connections.saveAndFlush(connection);
        assertTrue(call(packet(pa,"confirmar deshacer"),BASE).path("respuesta").asText().contains("vencio"));
        assertEquals(1,count());
    }
    @Test void audioSePuedeConfirmarConPalabraSimpleSinCodigo()throws Exception{
        connect(a,pa,true);
        var audio=packet(pa,"Gaste 15 en tacos con Nu prueba","audio","audio-simple",System.currentTimeMillis());
        call(audio,BASE);
        assertEquals(0,count());

        var malformed=call(packet(pa,"confirmar audio"),BASE).path("respuesta").asText();
        assertTrue(malformed.contains("Falta el codigo"));
        assertEquals(0,count());

        var r=call(packet(pa,"confirmar"),BASE);
        assertTrue(r.path("respuesta").asText().contains("registrado"));
        assertEquals(1,count());
        assertEquals(new BigDecimal("985.00"),accounts.findById(bank.getId()).orElseThrow().getSaldoActual());

        var r2=call(packet(pa,"confirmar"),BASE);
        assertTrue(r2.path("respuesta").asText().contains("ya no esta disponible"));
        assertEquals(1,count());
    }
}
