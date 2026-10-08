package com.gestionfinanzas.ai;

import com.gestionfinanzas.model.entity.*;
import com.gestionfinanzas.model.enums.*;
import com.gestionfinanzas.repository.*;
import com.gestionfinanzas.service.*;
import com.gestionfinanzas.dto.request.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

/** Sin transacción de clase: confirma operaciones y prueba concurrencia de verdad. */
@SpringBootTest @ActiveProfiles("test") @org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
class PropuestasChatIntegrationTest {
    @Autowired AiActionService acciones;
    @Autowired PropuestaChatService almacen;
    @Autowired PropuestaChatRepository propuestas;
    @Autowired UsuarioRepository usuarios;
    @Autowired CuentaRepository cuentas;
    @Autowired UsuarioService borrar;
    @Autowired PasswordEncoder passwords;
    @Autowired PlatformTransactionManager manager;
    @Autowired AiProvider provider;
    @Autowired AiFinancialContextService context;
    @Autowired CuentaService cuentaService;
    @Autowired CategoriaService categorias;
    @Autowired PresupuestoService presupuestos;
    @Autowired TransaccionService transacciones;
    @Autowired PlantillaRecurrenteService plantillas;
    @Autowired com.fasterxml.jackson.databind.ObjectMapper mapper;
    @Autowired jakarta.validation.Validator validator;
    @Autowired org.springframework.test.web.servlet.MockMvc mvc;
    @Autowired com.gestionfinanzas.security.JwtUtil jwt;
    Usuario a,b; Cuenta cuenta; TransactionTemplate tx;
    @BeforeEach void preparar() {
        tx=new TransactionTemplate(manager);
        a=usuario(); b=usuario();
        cuenta=cuentas.save(Cuenta.builder().usuario(a).nombre("Efectivo prueba").tipo(TipoCuenta.EFECTIVO)
            .saldoActual(new BigDecimal("100.00")).build());
    }
    Usuario usuario(){return usuarios.save(Usuario.builder().nombre("Prueba chat").email(UUID.randomUUID()+"@example.test")
        .passwordHash(passwords.encode("password123")).build());}
    @AfterEach void limpiar(){for(var u:List.of(a,b))if(usuarios.existsById(u.getId()))borrar.eliminarCuenta(u.getId(),new EliminarUsuarioRequest("password123"));}
    AiActionService.ActionProposal propuesta(){return acciones.interpretarCapturaRapida(a.getId(),"Gasté 25 en Efectivo prueba").action();}
    TransaccionRequest solicitudOffline(String monto) {
        return new TransaccionRequest(cuenta.getId(),null,null,TipoTransaccion.GASTO,
            new BigDecimal(monto),null,java.time.LocalDate.of(2026,10,8),"Prueba offline",null,null,null,null);
    }
    @Test void mismaClaveConDatosDistintosNoCambiaSaldo() {
        UUID clave=UUID.randomUUID();
        transacciones.crearTransaccion(a.getId(),solicitudOffline("25.00"),clave);
        assertThrows(IllegalArgumentException.class,()->transacciones.crearTransaccion(a.getId(),solicitudOffline("30.00"),clave));
        assertEquals(1,transacciones.listarRecientes(a.getId()).size());
        assertEquals(new BigDecimal("75.00"),cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
    }
    @Test void mismaClaveConEscalaDecimalEquivalenteNoDuplica() {
        UUID clave=UUID.randomUUID();
        var primero=transacciones.crearTransaccion(a.getId(),solicitudOffline("25.00"),clave);
        var segundo=transacciones.crearTransaccion(a.getId(),solicitudOffline("25"),clave);
        assertEquals(primero.id(),segundo.id());
        assertEquals(1,transacciones.listarRecientes(a.getId()).size());
    }
    @Test void otraInstanciaRecuperaLaPropuestaSinMoverDinero() {
        var p=propuesta();
        var otra=new AiActionService(provider,context,cuentaService,categorias,presupuestos,transacciones,plantillas,mapper,validator,almacen);
        assertEquals(p.id(),otra.pendientes(a.getId()).getFirst().id());
        assertEquals(new BigDecimal("100.00"),cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
        assertTrue(otra.pendientes(b.getId()).isEmpty());
    }
    @Test void reintentoDespuesDelCommitNoDuplicaMovimiento() {
        var p=propuesta(); String resultado=acciones.confirm(a.getId(),p.id(),p.version());
        assertEquals(resultado,acciones.confirm(a.getId(),p.id(),p.version()));
        assertEquals(1,transacciones.listarRecientes(a.getId()).size());
        assertEquals(new BigDecimal("75.00"),cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
    }
    @Test void confirmacionesSimultaneasCompartenResultado() throws Exception {
        var p=propuesta(); var executor=Executors.newFixedThreadPool(2); var inicio=new CountDownLatch(1);
        try {
            var uno=executor.submit(()->{inicio.await();return acciones.confirm(a.getId(),p.id(),p.version());});
            var dos=executor.submit(()->{inicio.await();return acciones.confirm(a.getId(),p.id(),p.version());});
            inicio.countDown(); assertEquals(uno.get(20,TimeUnit.SECONDS),dos.get(20,TimeUnit.SECONDS));
            assertEquals(1,transacciones.listarRecientes(a.getId()).size());
        }finally{executor.shutdownNow();assertTrue(executor.awaitTermination(10,TimeUnit.SECONDS));}
    }
    @Test void otraCuentaNoLeeEditaDescartaNiConfirmaUnaPropuesta() {
        var p=propuesta();
        assertThrows(IllegalArgumentException.class,()->acciones.confirm(b.getId(),p.id(),p.version()));
        assertThrows(IllegalArgumentException.class,()->acciones.descartar(b.getId(),p.id()));
        assertThrows(IllegalArgumentException.class,()->acciones.editar(b.getId(),p.id(),p.version(),solicitud("30")));
        assertEquals(1,acciones.pendientes(a.getId()).size());
    }
    TransaccionRequest solicitud(String monto){return new TransaccionRequest(cuenta.getId(),null,null,TipoTransaccion.GASTO,
        new BigDecimal(monto),null,CalendarioFinanciero.hoy(),"Corregido",null,null,null,null);}
    @Test void editarNoGuardaYUnaVersionAnteriorNoPuedeConfirmar() {
        var p=propuesta(); var nueva=acciones.editar(a.getId(),p.id(),p.version(),solicitud("30"));
        assertTrue(transacciones.listarRecientes(a.getId()).isEmpty());
        assertThrows(IllegalArgumentException.class,()->acciones.confirm(a.getId(),p.id(),p.version()));
        assertThrows(IllegalArgumentException.class,()->acciones.editar(a.getId(),p.id(),p.version(),solicitud("40")));
        acciones.confirm(a.getId(),p.id(),nueva.version());
        assertEquals(new BigDecimal("30.00"),transacciones.listarRecientes(a.getId()).getFirst().monto());
    }
    @Test void descartarPersisteYNoBorraTransacciones() {
        var p=propuesta(); acciones.descartar(a.getId(),p.id());acciones.descartar(a.getId(),p.id());
        assertTrue(acciones.pendientes(a.getId()).isEmpty());
        assertThrows(IllegalArgumentException.class,()->acciones.confirm(a.getId(),p.id(),p.version()));
        assertTrue(transacciones.listarRecientes(a.getId()).isEmpty());
    }
    @Test void falloFinancieroHaceRollbackYLaPropuestaSigueRecuperable() {
        var p=propuesta(); cuentas.deleteById(cuenta.getId());
        assertThrows(IllegalArgumentException.class,()->acciones.confirm(a.getId(),p.id(),p.version()));
        assertFalse(propuestas.findById(p.id()).orElseThrow().isCompletada());
        assertEquals(p.id(),acciones.pendientes(a.getId()).getFirst().id());
        assertTrue(transacciones.listarRecientes(a.getId()).isEmpty());
    }
    @Test void vencidaNoPuedeEjecutarsePeroUnResultadoConfirmadoSePuedeReintentar() {
        var p=propuesta();acciones.confirm(a.getId(),p.id(),p.version());
        tx.executeWithoutResult(s->{var fila=propuestas.findById(p.id()).orElseThrow();fila.setVence(Instant.now().minusSeconds(1));});
        assertTrue(acciones.confirm(a.getId(),p.id(),p.version()).startsWith("Listo."));
        var otra=propuesta();
        tx.executeWithoutResult(s->{var fila=propuestas.findById(otra.id()).orElseThrow();fila.setVence(Instant.now().minusSeconds(1));});
        assertThrows(IllegalArgumentException.class,()->acciones.confirm(a.getId(),otra.id(),otra.version()));
    }
    @Test void borrarCuentaLimpiaPropuestasPersistidas(){var p=propuesta();borrar.eliminarCuenta(a.getId(),new EliminarUsuarioRequest("password123"));assertFalse(propuestas.existsById(p.id()));}
    @Test void editarSinCambiarDatosDevuelveLaVersionReal() {
        var p=propuesta();var editada=acciones.editar(a.getId(),p.id(),p.version(),solicitud("30"));
        var igual=acciones.editar(a.getId(),p.id(),editada.version(),solicitud("30"));
        assertEquals(propuestas.findById(p.id()).orElseThrow().getVersion(),igual.version());
        assertDoesNotThrow(()->acciones.confirm(a.getId(),p.id(),igual.version()));
    }
    @Test void rollbackDelCommitRestauraPropuestaYSaldoParaReintentar() {
        var p=propuesta();
        assertThrows(IllegalStateException.class,()->tx.executeWithoutResult(s->{acciones.confirm(a.getId(),p.id(),p.version());throw new IllegalStateException("Rollback de prueba");}));
        assertFalse(propuestas.findById(p.id()).orElseThrow().isCompletada());
        assertTrue(transacciones.listarRecientes(a.getId()).isEmpty());
        assertEquals(new BigDecimal("100.00"),cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
        acciones.confirm(a.getId(),p.id(),p.version());assertEquals(1,transacciones.listarRecientes(a.getId()).size());
    }
    @Test void loteInvalidoNoDejaPropuestasParciales() {
        var datos=mapper.valueToTree(solicitud("25"));
        assertThrows(IllegalArgumentException.class,()->almacen.crearLote(a.getId(),List.of(
            new PropuestaChatService.NuevaPropuesta("CREATE_TRANSACTION","Valida",datos),
            new PropuestaChatService.NuevaPropuesta("CREATE_TRANSACTION","x".repeat(501),datos))));
        assertTrue(acciones.pendientes(a.getId()).isEmpty());
    }
    @Test void apiRecuperaEditaYConfirmaLaVersionExacta() throws Exception {
        var p=propuesta();String token=jwt.generarToken(a.getEmail(),a.getId(),a.getTokenVersion());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/asistente/acciones"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/asistente/acciones").header("Authorization","Bearer "+token))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.data[0].id").value(p.id()));
        String body=mapper.writeValueAsString(java.util.Map.of("version",p.version(),"datos",solicitud("30")));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/asistente/acciones/"+p.id()).header("Authorization","Bearer "+token)
            .contentType("application/json").content(body)).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.data.version").value(1));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/asistente/acciones/"+p.id()+"/confirmar").header("Authorization","Bearer "+token)
            .contentType("application/json").content("{\"version\":0}")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/asistente/acciones/"+p.id()+"/confirmar").header("Authorization","Bearer "+token)
            .contentType("application/json").content("{\"version\":1}")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.data.completed").value(true));
        assertEquals(new BigDecimal("30.00"),transacciones.listarRecientes(a.getId()).getFirst().monto());
    }
}
