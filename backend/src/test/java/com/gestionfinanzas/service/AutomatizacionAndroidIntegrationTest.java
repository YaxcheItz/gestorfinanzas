package com.gestionfinanzas.service;

import com.gestionfinanzas.controller.AvisoFinancieroController.Clase;
import com.gestionfinanzas.dto.request.AutomatizacionAndroidRequest.*;
import com.gestionfinanzas.model.entity.*;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest @ActiveProfiles("test") @Transactional
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
class AutomatizacionAndroidIntegrationTest {
    @Test void ingresoRevolutExigeConsentimientoYReintentaSinDuplicarSaldo() {
        var cap=conectar();
        var ingreso=new Evento(reglaId,"e".repeat(64),Clase.INGRESO,"MXN",new BigDecimal("250.00"),CalendarioFinanciero.hoy(),"Ingreso Revolut");
        assertThrows(IllegalArgumentException.class,()->service.recibir(cap.clave(),ingreso));
        var rule=new Regla(reglaId,"REVOLUT","com.revolut.revolut",null,null,cuenta.getId(),lista,null,true);
        var enabled=service.configurar(usuario.getId(),new Configuracion(dispositivo,true,List.of(rule)));
        assertTrue(service.estado(usuario.getId(),dispositivo).reglas().get(0).ingresosMxn());
        var first=service.recibir(enabled.clave(),ingreso);
        assertEquals("REGISTRADO",first.estado());
        assertEquals(first.transaccionId(),service.recibir(enabled.clave(),ingreso).transaccionId());
        assertEquals(new BigDecimal("1250.00"),saldo());
        cuenta.setMoneda("USD");cuentas.saveAndFlush(cuenta);
        var foreign=new Evento(reglaId,"f".repeat(64),Clase.INGRESO,"USD",new BigDecimal("25.00"),CalendarioFinanciero.hoy(),"Ingreso Revolut");
        assertThrows(IllegalArgumentException.class,()->service.recibir(enabled.clave(),foreign));
    }
    @Test void consentimientoIngresoNoSeExtiendeAOtrosBancosOMonedas() {
        var rule=new Regla(reglaId,"SANTANDER","mx.bancosantander.supermovil",null,null,cuenta.getId(),lista,null,true);
        assertThrows(IllegalArgumentException.class,()->service.configurar(usuario.getId(),new Configuracion(dispositivo,true,List.of(rule))));
        cuenta.setMoneda("USD");cuentas.saveAndFlush(cuenta);
        var revolut=new Regla(reglaId,"REVOLUT","com.revolut.revolut",null,null,cuenta.getId(),lista,null,true);
        assertThrows(IllegalArgumentException.class,()->service.configurar(usuario.getId(),new Configuracion(dispositivo,true,List.of(revolut))));
    }
    @Test void reglasAnterioresSinCampoIngresoConservanConsentimientoDesactivado() throws Exception {
        String json=mapper.writeValueAsString(regla(cuenta.getId())).replace(",\"ingresosMxn\":false","");
        assertFalse(mapper.readValue(json,Regla.class).ingresosMxn());
    }
    @Autowired AutomatizacionAndroidService service;
    @Autowired UsuarioRepository usuarios;
    @Autowired CuentaRepository cuentas;
    @Autowired ConexionAndroidRepository conexiones;
    @Autowired ListaService listas;
    @Autowired org.springframework.test.web.servlet.MockMvc mvc;
    @Autowired com.fasterxml.jackson.databind.ObjectMapper mapper;
    Usuario usuario; Cuenta cuenta; Long lista;
    UUID dispositivo=UUID.randomUUID(), reglaId=UUID.randomUUID();

    @BeforeEach void preparar() {
        usuario=usuarios.saveAndFlush(Usuario.builder().nombre("QA automatizacion")
            .email(UUID.randomUUID()+"@example.test").passwordHash("synthetic").build());
        lista=listas.personal(usuario.getId()).getId();
        cuenta=cuentas.saveAndFlush(Cuenta.builder().usuario(usuario).nombre("Revolut QA")
            .tipo(TipoCuenta.DEBITO).moneda("MXN").saldoActual(new BigDecimal("1000.00")).build());
    }
    Regla regla(Long cuentaId) {
        return new Regla(reglaId,"REVOLUT","com.revolut.revolut",null,null,cuentaId,lista,null);
    }
    AutomatizacionAndroidService.Credencial conectar() {
        return service.configurar(usuario.getId(),new Configuracion(dispositivo,true,List.of(regla(cuenta.getId()))));
    }
    Evento evento(String id) {
        return new Evento(reglaId,id,Clase.COMPRA,"MXN",new BigDecimal("25.00"),CalendarioFinanciero.hoy(),"Tienda QA");
    }
    BigDecimal saldo() { return cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual(); }

    @Test void registraSinConfirmacionYReintentaSinDuplicar() {
        var credencial=conectar();
        var primero=service.recibir(credencial.clave(),evento("a".repeat(64)));
        assertEquals("REGISTRADO",primero.estado());
        var repetido=service.recibir(credencial.clave(),evento("a".repeat(64)));
        assertEquals(primero.transaccionId(),repetido.transaccionId());
        assertEquals(new BigDecimal("975.00"),saldo());
        assertTrue(conexiones.findByTokenHash(credencial.clave()).isEmpty());
        assertNotEquals(credencial.clave(),conexiones.findByUsuarioIdAndDispositivoId(
            usuario.getId(),dispositivo.toString()).orElseThrow().getTokenHash());
    }
    @Test void posibleDuplicadoPermanecePendienteSinSegundoCargo() {
        var credencial=conectar();
        service.recibir(credencial.clave(),evento("a".repeat(64)));
        var segundo=service.recibir(credencial.clave(),evento("b".repeat(64)));
        assertEquals("PENDIENTE",segundo.estado());
        assertFalse(segundo.coincidencias().isEmpty());
        assertEquals(new BigDecimal("975.00"),saldo());
    }
    @Test void creditoSinLimiteNiFechasRegistraDeudaSinInventarMetadatos() {
        cuenta.setTipo(TipoCuenta.CREDITO); cuenta.setSaldoActual(BigDecimal.ZERO);
        cuentas.saveAndFlush(cuenta);
        var credencial=conectar();
        assertEquals("REGISTRADO",service.recibir(credencial.clave(),evento("a".repeat(64))).estado());
        assertEquals(new BigDecimal("-25.00"),saldo());
        var actual=cuentas.findById(cuenta.getId()).orElseThrow();
        assertNull(actual.getLimiteCredito()); assertNull(actual.getDiaCorte()); assertNull(actual.getDiaPago());
    }
    @Test void rotarRevocarYVersionDeSesionInvalidanClave() {
        var inicial=conectar(); var nueva=conectar();
        assertThrows(SesionInvalidaException.class,()->service.recibir(inicial.clave(),evento("a".repeat(64))));
        service.desconectar(usuario.getId(),dispositivo);
        assertThrows(SesionInvalidaException.class,()->service.recibir(nueva.clave(),evento("a".repeat(64))));
        var tercera=conectar();
        usuario.setTokenVersion(usuario.getTokenVersion()+1); usuarios.saveAndFlush(usuario);
        assertFalse(service.estado(usuario.getId(),dispositivo).activa());
        assertThrows(SesionInvalidaException.class,()->service.recibir(tercera.clave(),evento("a".repeat(64))));
        assertEquals(new BigDecimal("1000.00"),saldo());
    }
    @Test void rechazaCuentaAjenaYOrigenFalso() {
        var otro=usuarios.saveAndFlush(Usuario.builder().nombre("Otro QA")
            .email(UUID.randomUUID()+"@example.test").passwordHash("synthetic").build());
        var ajena=cuentas.saveAndFlush(Cuenta.builder().usuario(otro).nombre("Ajena QA")
            .tipo(TipoCuenta.DEBITO).moneda("MXN").saldoActual(BigDecimal.ZERO).build());
        assertThrows(IllegalArgumentException.class,()->service.configurar(usuario.getId(),
            new Configuracion(dispositivo,true,List.of(regla(ajena.getId())))));
        var falsa=new Regla(reglaId,"REVOLUT","com.example.fake",null,null,cuenta.getId(),lista,null);
        assertThrows(IllegalArgumentException.class,()->service.configurar(usuario.getId(),
            new Configuracion(dispositivo,true,List.of(falsa))));
    }
    @Test void exigeConsentimientoYNoPermiteTransferenciasImplicitas() {
        assertThrows(IllegalArgumentException.class,()->service.configurar(usuario.getId(),
            new Configuracion(dispositivo,false,List.of(regla(cuenta.getId())))));
        var credencial=conectar();
        var transferencia=new Evento(reglaId,"a".repeat(64),Clase.PAGO_TARJETA,"MXN",
            new BigDecimal("25.00"),CalendarioFinanciero.hoy(),"Pago QA");
        assertThrows(IllegalArgumentException.class,()->service.recibir(credencial.clave(),transferencia));
        assertEquals(new BigDecimal("1000.00"),saldo());
    }
    @Test void santanderSoloPermiteComprasSinIngresosNiDevoluciones() {
        var r=new Regla(reglaId,"SANTANDER","mx.bancosantander.supermovil",null,"1234",cuenta.getId(),lista,null);
        var cap=service.configurar(usuario.getId(),new Configuracion(dispositivo,true,List.of(r)));
        for(var clase:List.of(Clase.INGRESO,Clase.DEVOLUCION)) {
            var ingreso=new Evento(reglaId,"d".repeat(64),clase,"MXN",new BigDecimal("25.00"),CalendarioFinanciero.hoy(),"Ingreso QA");
            assertThrows(IllegalArgumentException.class,()->service.recibir(cap.clave(),ingreso));
        }
        assertEquals(new BigDecimal("1000.00"),saldo());
    }
    @Test void dosTarjetasSearsCompartenCuentaYConservanIdempotencia() {
        cuenta.setTipo(TipoCuenta.CREDITO);cuenta.setSaldoActual(BigDecimal.ZERO);cuentas.saveAndFlush(cuenta);
        var first=new Regla(reglaId,"SEARS","com.google.android.apps.messaging","12345","1234",cuenta.getId(),lista,null);
        var second=new Regla(UUID.randomUUID(),"SEARS","com.google.android.apps.messaging","12345","5678",cuenta.getId(),lista,null);
        long count=cuentas.count();
        var cap=service.configurar(usuario.getId(),new Configuracion(dispositivo,true,List.of(first,second)));
        assertEquals(2,cap.reglas().size());assertEquals(count,cuentas.count());
        assertEquals("REGISTRADO",service.recibir(cap.clave(),evento("e".repeat(64))).estado());
        var digital=new Evento(second.id(),"f".repeat(64),Clase.COMPRA,"MXN",new BigDecimal("32.00"),CalendarioFinanciero.hoy(),"Otra tienda QA");
        var result=service.recibir(cap.clave(),digital);assertEquals("REGISTRADO",result.estado());
        assertEquals(result.transaccionId(),service.recibir(cap.clave(),digital).transaccionId());
        assertEquals(new BigDecimal("-57.00"),saldo());assertEquals(count,cuentas.count());
    }
    @Test void receptorExigeClaveYNoAbreGestionNiOtrosMetodos() throws Exception {
        var credencial=conectar();
        String body=mapper.writeValueAsString(evento("c".repeat(64)));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/canales/android/evento")
            .contentType("application/json").content(body))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/canales/android/evento")
            .header("X-Kaptal-Android",credencial.clave()).contentType("application/json").content(body))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.data.estado").value("REGISTRADO"));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/automatizacion/android/"+dispositivo)
            .header("X-Kaptal-Android",credencial.clave()))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/canales/android/evento")
            .header("X-Kaptal-Android",credencial.clave()))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
    }
}
