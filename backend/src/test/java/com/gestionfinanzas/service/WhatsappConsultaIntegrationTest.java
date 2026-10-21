package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.*;
import com.gestionfinanzas.controller.WhatsappConsultaController;
import com.gestionfinanzas.model.entity.*;
import com.gestionfinanzas.model.enums.*;
import com.gestionfinanzas.repository.*;
import com.gestionfinanzas.security.CustomUserDetails;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class WhatsappConsultaIntegrationTest {
    @Autowired UsuarioRepository usuarios;
    @Autowired CuentaRepository cuentas;
    @Autowired TransaccionRepository transacciones;
    @Autowired AvisoFinancieroRepository avisos;
    @Autowired PropuestaChatRepository propuestas;
    @Autowired WhatsappConsultaController controller;
    @Autowired ObjectMapper mapper;
    @Autowired MockMvc mvc;
    Usuario owner,foreign;Cuenta nu,bbva;
    @BeforeEach void setup(){
        owner=usuarios.save(Usuario.builder().nombre("Owner QA").email(UUID.randomUUID()+"@example.test").passwordHash("synthetic").build());
        foreign=usuarios.save(Usuario.builder().nombre("Other QA").email(UUID.randomUUID()+"@example.test").passwordHash("synthetic").build());
        nu=account(owner,"Nu","MXN","1000.00");bbva=account(owner,"BBVA","USD","20.00");
        account(foreign,"Secreto","MXN","9999.00");
    }
    Cuenta account(Usuario u,String name,String currency,String balance){return cuentas.saveAndFlush(Cuenta.builder().usuario(u).nombre(name).tipo(TipoCuenta.DEBITO).moneda(currency).saldoActual(new BigDecimal(balance)).build());}
    JsonNode query(String text)throws Exception{
        String body=mapper.writeValueAsString(Map.of("texto",text));
        String response=mvc.perform(post("/api/canales/whatsapp/interpretar").with(user(new CustomUserDetails(owner))).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        return mapper.readTree(response).get("data");
    }
    @Test void consultaTodasLasCuentasSinMezclarMonedasNiOtrosUsuarios()throws Exception{
        var r=query("¿Cuánto tengo en todas mis cuentas?");assertEquals("CONSULTA",r.path("tipo").asText());
        String s=r.path("respuesta").asText();assertTrue(s.contains("Nu: 1000.00 MXN"));assertTrue(s.contains("BBVA: 20.00 USD"));assertFalse(s.contains("Secreto"));assertFalse(s.contains("1020"));
    }
    @Test void sinCuentaPreguntaSinElegirUnaPorHistorial()throws Exception{
        var r=query("Gasté 180 en tacos");assertEquals("ACLARACION",r.path("tipo").asText());assertTrue(r.path("propuesta").isNull());assertTrue(r.path("contexto").asText().contains(CalendarioFinanciero.hoy().toString()));
        assertTrue(r.path("sugerencias").toString().contains("Nu"));assertFalse(r.toString().contains("Secreto"));
    }
    @Test void resuelveCuentaEnSegundaRespuestaSinRegistrar()throws Exception{
        var first=query("Gasté 180 en tacos");var r=query(first.path("contexto").asText()+" desde Nu");
        assertEquals("PROPUESTA",r.path("tipo").asText());assertEquals(nu.getId(),r.path("propuesta").path("cuentaId").asLong());assertEquals(new BigDecimal("180.00"),r.path("propuesta").path("monto").decimalValue().setScale(2));
        assertEquals(0,transacciones.findAllByUsuarioIdOrderByFechaAscIdAsc(owner.getId()).size());assertEquals(new BigDecimal("1000.00"),cuentas.findById(nu.getId()).orElseThrow().getSaldoActual());assertEquals(0,propuestas.findByUsuarioIdAndCompletadaFalseAndDescartadaFalseAndVenceAfterOrderByVenceAsc(owner.getId(),java.time.Instant.now()).size());
    }
    @Test void gastoExplicitoEnCualquieraDeLasCuentas()throws Exception{var r=query("Gasto 5 USD cafe con BBVA");assertEquals(bbva.getId(),r.path("propuesta").path("cuentaId").asLong());assertEquals("USD",r.path("moneda").asText());}
    @Test void cuentaAjenaNoSeResuelve()throws Exception{var r=query("Gasté 180 desde Secreto");assertEquals("ACLARACION",r.path("tipo").asText());assertTrue(r.path("propuesta").isNull());}
    @Test void cuentasAmbiguasNoSeEligen()throws Exception{account(owner,"Nu","MXN","10");var r=query("Gasto 180 con Nu");assertEquals("ACLARACION",r.path("tipo").asText());}
    @Test void nombreCompletoNoSeConfundeConPalabrasCompartidas()throws Exception{
        var una=account(owner,"Nu personal","MXN","10");account(owner,"BBVA personal","MXN","10");
        var r=query("Gasto 180 con Nu personal");assertEquals("PROPUESTA",r.path("tipo").asText());assertEquals(una.getId(),r.path("propuesta").path("cuentaId").asLong());
    }
    @Test void cuentaInactivaNoSeUsa()throws Exception{nu.setActivo(false);cuentas.saveAndFlush(nu);assertEquals("ACLARACION",query("Gasto 180 con Nu").path("tipo").asText());}
    @Test void monedaContradictoriaPideAclaracion()throws Exception{assertEquals("ACLARACION",query("Gasto 180 USD con Nu").path("tipo").asText());}
    @Test void saldoPorCuentaNoDevuelveTodas()throws Exception{String s=query("saldo de Nu").path("respuesta").asText();assertTrue(s.contains("Nu"));assertFalse(s.contains("BBVA"));assertFalse(s.contains("Secreto"));}
    @Test void resumenEsConsultaSinPropuestasNiEscrituras()throws Exception{long count=propuestas.count();var r=query("¿Cuánto gasté este mes?");assertEquals("CONSULTA",r.path("tipo").asText());assertTrue(r.path("desde").asText().endsWith("01"));assertEquals(count,propuestas.count());}
    @Test void comparacionMensualUsaDatosPropiosSinModificarDinero()throws Exception{
        var actual=CalendarioFinanciero.hoy().withDayOfMonth(1);var anterior=actual.minusMonths(1);
        transacciones.saveAndFlush(Transaccion.builder().usuario(owner).cuenta(nu).tipo(TipoTransaccion.GASTO).monto(new BigDecimal("40.25")).fecha(actual).descripcion("Gasto sintetico").build());
        transacciones.saveAndFlush(Transaccion.builder().usuario(owner).cuenta(nu).tipo(TipoTransaccion.GASTO).monto(new BigDecimal("10.20")).fecha(anterior).descripcion("Gasto previo sintetico").build());
        var ajena=cuentas.findByUsuarioIdAndActivoTrue(foreign.getId()).get(0);
        transacciones.saveAndFlush(Transaccion.builder().usuario(foreign).cuenta(ajena).tipo(TipoTransaccion.GASTO).monto(new BigDecimal("9000.00")).fecha(actual).descripcion("Ajeno sintetico").build());
        transacciones.saveAndFlush(Transaccion.builder().usuario(owner).cuenta(nu).cuentaDestino(bbva).tipo(TipoTransaccion.TRANSFERENCIA).monto(new BigDecimal("700.00")).fecha(actual).descripcion("Transferencia sintetica").build());
        transacciones.saveAndFlush(Transaccion.builder().usuario(owner).cuenta(bbva).tipo(TipoTransaccion.GASTO).monto(new BigDecimal("2.50")).fecha(actual).descripcion("Gasto en USD sintetico").build());
        long total=transacciones.count();long drafts=propuestas.count();long inbox=avisos.count();
        var r=query("Compara este mes con el anterior en MXN");
        assertEquals("CONSULTA",r.path("tipo").asText());assertTrue(r.path("propuesta").isNull());
        String text=r.path("respuesta").asText();assertTrue(text.contains("actual 40.25, anterior 10.20, diferencia 30.05"));
        assertFalse(text.contains("9000"));assertFalse(text.contains("700"));assertFalse(text.contains("USD"));
        assertEquals(total,transacciones.count());assertEquals(drafts,propuestas.count());assertEquals(inbox,avisos.count());
        assertEquals(new BigDecimal("1000.00"),cuentas.findById(nu.getId()).orElseThrow().getSaldoActual());
        String chat=mvc.perform(post("/api/asistente/chat").with(user(new CustomUserDetails(owner)))
                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(Map.of(
                        "messages",List.of(Map.of("role","USER","content","Compara este mes con el anterior en MXN")),
                        "consentimientoDatosFinancieros",false))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        var evidence=mapper.readTree(chat).path("data").path("evidence");
        assertEquals(4,evidence.size());
        var expense=java.util.stream.StreamSupport.stream(evidence.spliterator(),false).filter(e->e.path("label").asText().equals("Gastos actual")).findFirst().orElseThrow();
        assertEquals(1,expense.path("operaciones").asLong());assertEquals(new BigDecimal("40.25"),expense.path("total").decimalValue());
        String history=mvc.perform(get("/api/transacciones").with(user(new CustomUserDetails(owner)))
                .param("tipo",expense.path("tipo").asText()).param("moneda",expense.path("moneda").asText())
                .param("fechaInicio",expense.path("desde").asText()).param("fechaFin",expense.path("hasta").asText()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        var page=mapper.readTree(history).path("data");assertEquals(1,page.path("totalElements").asLong());
        assertEquals(new BigDecimal("40.25"),page.path("content").get(0).path("monto").decimalValue());
        String csv=mvc.perform(get("/api/transacciones/exportar").with(user(new CustomUserDetails(owner)))
                .param("tipo","GASTO").param("moneda","MXN").param("fechaInicio",actual.toString()).param("fechaFin",CalendarioFinanciero.hoy().toString()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(csv.contains("40.25"));assertFalse(csv.contains("2.50"));assertFalse(csv.contains("9000"));assertFalse(csv.contains("Transferencia sintetica"));
        assertEquals(total,transacciones.count());assertEquals(drafts,propuestas.count());assertEquals(inbox,avisos.count());
    }
    @Test void monedaInvalidaNoSeIgnoraEnHistorial()throws Exception{
        mvc.perform(get("/api/transacciones").with(user(new CustomUserDetails(owner))).param("moneda","MXN,USD"))
                .andExpect(status().isBadRequest());
    }
    @Test void comandosDestructivosYComplejosNoEjecutanAcciones()throws Exception{assertEquals("ACLARACION",query("Elimina todas mis cuentas").path("tipo").asText());assertEquals("ACLARACION",query("Compara mi reporte con el año pasado").path("tipo").asText());assertTrue(cuentas.existsById(nu.getId()));}
    @Test void sinSesionNoHayAcceso()throws Exception{mvc.perform(post("/api/canales/whatsapp/interpretar").contentType(MediaType.APPLICATION_JSON).content("{\"texto\":\"saldo\"}")).andExpect(status().isUnauthorized());}
    @Test void limitaTamanoYValidaTexto()throws Exception{mvc.perform(post("/api/canales/whatsapp/interpretar").with(user(new CustomUserDetails(owner))).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(Map.of("texto","x".repeat(1201))))).andExpect(status().isBadRequest());}
    @Test void devolucionNoSeInterpretaComoCompraPorPalabrasDeComida()throws Exception{var r=query("Me devolvieron 25 del cafe con Nu");assertEquals("ACLARACION",r.path("tipo").asText());assertTrue(r.path("propuesta").isNull());}
}
