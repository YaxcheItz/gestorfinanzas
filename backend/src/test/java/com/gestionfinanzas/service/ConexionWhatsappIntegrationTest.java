package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.repository.UsuarioRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.security.CustomUserDetails;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties={"whatsapp.channel.enabled=true", "whatsapp.channel.bot-phone=+15555550100",
        "whatsapp.channel.phone-number-id=12345", "whatsapp.channel.webhook-secret=synthetic-webhook-secret-at-least-32"})
@AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class ConexionWhatsappIntegrationTest {
    static final String BASE="/api/canales/whatsapp/conexion";
    static final String EVENT="/api/canales/whatsapp/vinculacion/evento";
    static final String SECRET="synthetic-webhook-secret-at-least-32";
    static final AtomicInteger sequence=new AtomicInteger(1000);
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UsuarioRepository usuarios;
    @Autowired TransaccionRepository movimientos;
    @Autowired EntityManager em;
    Usuario a,b;
    String phone;

    @BeforeEach void setup(){
        a=usuarios.saveAndFlush(Usuario.builder().nombre("A QA").email(UUID.randomUUID()+"@example.test").passwordHash("synthetic").build());
        b=usuarios.saveAndFlush(Usuario.builder().nombre("B QA").email(UUID.randomUUID()+"@example.test").passwordHash("synthetic").build());
        phone="+1555555"+sequence.incrementAndGet();
    }
    JsonNode body(MockHttpServletRequestBuilder request,int expected)throws Exception{
        return mapper.readTree(mvc.perform(request).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8)).path("data");
    }
    JsonNode start(Usuario owner,String number)throws Exception{
        return body(post(BASE).with(user(new CustomUserDetails(owner))).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("telefono",number,"aceptarVinculacion",true))),201);
    }
    JsonNode state(Usuario owner)throws Exception{return body(get(BASE).with(user(new CustomUserDetails(owner))),200);}
    byte[] event(String sender,String text,String bot,Instant timestamp,boolean passive)throws Exception{
        return mapper.writeValueAsBytes(Map.of("phone_number_id",bot,"message",Map.of("id",UUID.randomUUID().toString(),
                "from",sender,"timestamp",Long.toString(timestamp.getEpochSecond()),"type","text",
                "text",Map.of("body",text),"kapso",Map.of("direction","inbound","passive",passive))));
    }
    String signature(byte[] raw)throws Exception{
        Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(raw));
    }
    JsonNode confirm(String sender,String code)throws Exception{
        byte[] raw=event(sender,"vincular "+code,"12345",Instant.now(),false);
        return body(post(EVENT).contentType(MediaType.APPLICATION_JSON).header("X-Webhook-Signature",signature(raw)).content(raw),200);
    }

    @Test void exigeSesionParaAdministrarYFirmaParaVerificar()throws Exception{
        mvc.perform(get(BASE)).andExpect(status().isUnauthorized());
        mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isUnauthorized());
        mvc.perform(delete(BASE)).andExpect(status().isUnauthorized());
        mvc.perform(post(EVENT).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isUnauthorized());
    }
    @Test void creaDesafioSinDineroYNoExponeCodigoEnEstado()throws Exception{
        var challenge=start(a,phone);String code=challenge.path("codigo").asText();
        assertTrue(code.matches("KAPTAL-[A-Za-z0-9_-]{32}"));
        assertTrue(challenge.path("urlWhatsapp").asText().startsWith("https://wa.me/15555550100?text="));
        assertEquals("PENDIENTE",state(a).path("estado").asText());
        assertFalse(state(a).toString().contains(code));assertFalse(state(a).toString().contains(phone));
        String hash=em.createQuery("select c.desafioHash from ConexionWhatsapp c where c.usuario.id=:id",String.class).setParameter("id",a.getId()).getSingleResult();
        assertEquals(64,hash.length());assertNotEquals(code,hash);
        assertTrue(movimientos.findAllByUsuarioIdOrderByFechaAscIdAsc(a.getId()).isEmpty());
    }
    @Test void verificaSoloElNumeroEsperadoYConsumeCodigoUnaVez()throws Exception{
        String code=start(a,phone).path("codigo").asText();
        assertFalse(confirm("15555559999",code).path("verificado").asBoolean());
        var result=confirm(phone.substring(1),code);assertTrue(result.path("verificado").asBoolean());
        assertFalse(result.has("usuarioId"));assertEquals("VERIFICADA",state(a).path("estado").asText());
        assertFalse(confirm(phone,code).path("verificado").asBoolean());
        assertEquals("DESCONECTADA",state(b).path("estado").asText());
    }
    @Test void dosUsuariosTienenConexionesSeparadas()throws Exception{
        String ca=start(a,phone).path("codigo").asText();String pb="+1555555"+sequence.incrementAndGet();String cb=start(b,pb).path("codigo").asText();
        assertTrue(confirm(phone,ca).path("verificado").asBoolean());assertTrue(confirm(pb,cb).path("verificado").asBoolean());
        assertNotEquals(state(a).path("conexionId"),state(b).path("conexionId"));
        body(delete(BASE).with(user(new CustomUserDetails(a))),200);
        assertEquals("DESCONECTADA",state(a).path("estado").asText());assertEquals("VERIFICADA",state(b).path("estado").asText());
    }
    @Test void unNumeroVerificadoNoSeReasignaAOtroUsuario()throws Exception{
        String ca=start(a,phone).path("codigo").asText();assertTrue(confirm(phone,ca).path("verificado").asBoolean());
        String cb=start(b,phone).path("codigo").asText();assertFalse(confirm(phone,cb).path("verificado").asBoolean());
        assertEquals("VERIFICADA",state(a).path("estado").asText());assertEquals("PENDIENTE",state(b).path("estado").asText());
    }
    @Test void pendientesAjenosNoReservanElTelefonoSinProbarPropiedad()throws Exception{
        start(a,phone);String cb=start(b,phone).path("codigo").asText();assertTrue(confirm(phone,cb).path("verificado").asBoolean());
        assertEquals("PENDIENTE",state(a).path("estado").asText());
    }
    @Test void codigoCaducadoYDesconexionNoPermitenVerificacion()throws Exception{
        String code=start(a,phone).path("codigo").asText();
        em.createQuery("update ConexionWhatsapp c set c.vence=:vence where c.usuario.id=:id").setParameter("vence",Instant.now().minusSeconds(1)).setParameter("id",a.getId()).executeUpdate();em.clear();
        assertFalse(confirm(phone,code).path("verificado").asBoolean());assertEquals("CADUCADA",state(a).path("estado").asText());
        body(delete(BASE).with(user(new CustomUserDetails(a))),200);assertFalse(confirm(phone,code).path("verificado").asBoolean());
    }
    @Test void limitaReemisionYExigeDesconectarUnaConexionVerificada()throws Exception{
        String code=start(a,phone).path("codigo").asText();
        body(post(BASE).with(user(new CustomUserDetails(a))).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(Map.of("telefono",phone,"aceptarVinculacion",true))),429);
        confirm(phone,code);
        body(post(BASE).with(user(new CustomUserDetails(a))).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(Map.of("telefono",phone,"aceptarVinculacion",true))),409);
    }
    @Test void rechazaEventosDeOtroBotAntiguosPasivosYManipulados()throws Exception{
        String code=start(a,phone).path("codigo").asText();
        // Leave margin beyond the five-minute policy: slower CI can cross a second boundary
        // while processing the preceding requests and otherwise turn +301 into valid +300.
        for(byte[] raw:new byte[][]{event(phone,"vincular "+code,"999",Instant.now(),false),event(phone,"vincular "+code,"12345",Instant.now().minusSeconds(601),false),event(phone,"vincular "+code,"12345",Instant.now(),true),event(phone,"vincular "+code,"12345",Instant.now().plusSeconds(3600),false)}){
            assertFalse(body(post(EVENT).contentType(MediaType.APPLICATION_JSON).header("X-Webhook-Signature",signature(raw)).content(raw),200).path("verificado").asBoolean());
        }
        byte[] raw=event(phone,"vincular "+code,"12345",Instant.now(),false);
        mvc.perform(post(EVENT).contentType(MediaType.APPLICATION_JSON).header("X-Webhook-Signature","0".repeat(64)).content(raw)).andExpect(status().isUnauthorized());
        assertEquals("PENDIENTE",state(a).path("estado").asText());
    }
    @Test void cuerpoLimitadoJsonInvalidoYConsentimientoObligatorio()throws Exception{
        mvc.perform(post(EVENT).contentType(MediaType.APPLICATION_JSON).content("x".repeat(65537))).andExpect(status().isPayloadTooLarge());
        byte[] raw="{broken".getBytes(StandardCharsets.UTF_8);
        mvc.perform(post(EVENT).contentType(MediaType.APPLICATION_JSON).header("X-Webhook-Signature",signature(raw)).content(raw)).andExpect(status().isBadRequest());
        for(String number:new String[]{"555123", "+52abc5512345678", "15555550100"})
            mvc.perform(post(BASE).with(user(new CustomUserDetails(a))).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(Map.of("telefono",number,"aceptarVinculacion",true)))).andExpect(status().isBadRequest());
        mvc.perform(post(BASE).with(user(new CustomUserDetails(a))).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(Map.of("telefono",phone,"aceptarVinculacion",false)))).andExpect(status().isBadRequest());
    }
    @Test void conservaNumeroInternacionalSinInventarDigitosMexicanos()throws Exception{
        String mexican="+5255"+String.format("%08d",sequence.incrementAndGet());String code=start(a,mexican).path("codigo").asText();
        assertFalse(confirm("521"+mexican.substring(3),code).path("verificado").asBoolean());
        assertTrue(confirm(mexican,code).path("verificado").asBoolean());
    }
    @Test void borrarUsuarioBorraSuConexion()throws Exception{
        start(a,phone);em.clear();usuarios.deleteById(a.getId());usuarios.flush();em.clear();
        assertEquals(0L,em.createQuery("select count(c) from ConexionWhatsapp c where c.usuario.id=:id",Long.class).setParameter("id",a.getId()).getSingleResult());
    }
    @Test void reemitirInvalidaCodigoAnteriorYAumentaGeneracion()throws Exception{
        String old=start(a,phone).path("codigo").asText();long generation=state(a).path("generacion").asLong();
        em.createQuery("update ConexionWhatsapp c set c.emitida=:emitida where c.usuario.id=:id").setParameter("emitida",Instant.now().minusSeconds(61)).setParameter("id",a.getId()).executeUpdate();em.clear();
        String next=start(a,phone).path("codigo").asText();assertNotEquals(old,next);
        assertFalse(confirm(phone,old).path("verificado").asBoolean());assertTrue(confirm(phone,next).path("verificado").asBoolean());
        assertTrue(state(a).path("generacion").asLong()>generation);
    }
    @Test void desvincularLiberaNumeroPeroNoReviveElCodigoConsumido()throws Exception{
        String ca=start(a,phone).path("codigo").asText();confirm(phone,ca);long generation=state(a).path("generacion").asLong();
        body(delete(BASE).with(user(new CustomUserDetails(a))),200);
        assertTrue(state(a).path("generacion").asLong()>generation);
        assertFalse(confirm(phone,ca).path("verificado").asBoolean());
        String cb=start(b,phone).path("codigo").asText();assertTrue(confirm(phone,cb).path("verificado").asBoolean());
    }
}
