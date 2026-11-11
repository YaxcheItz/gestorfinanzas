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
    @Autowired AiAssistantService asistente;
    @org.springframework.test.context.bean.override.mockito.MockitoBean GroqAiProvider groq;
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
        var otra=new AiActionService(provider,context,cuentaService,categorias,presupuestos,transacciones,plantillas,mapper,validator,almacen,new com.gestionfinanzas.security.LimiteAbuso());
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
    @Test void propuestasAbandonadasNoBloqueanNiInvalidanOtraVentana() {
        var primera=propuesta();
        for (int i=0;i<50;i++) almacen.crear(a.getId(),"CREATE_TRANSACTION","Ejemplo",mapper.createObjectNode());
        assertEquals(51,almacen.pendientes(a.getId()).size());
        assertTrue(almacen.pendientes(b.getId()).isEmpty());
        String resultado=acciones.confirm(a.getId(),primera.id(),primera.version());
        assertEquals(resultado,acciones.confirm(a.getId(),primera.id(),primera.version()));
        assertEquals(1,transacciones.listarRecientes(a.getId()).size());
        assertEquals(new BigDecimal("75.00"),cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
    }
    @Test void limiteDeCreacionSigueAcotadoYEsIndependientePorCuenta() {
        var datos=mapper.createObjectNode();
        for (int i=0;i<500;i++) almacen.crear(a.getId(),"CREATE_TRANSACTION","Ejemplo",datos);
        assertThrows(com.gestionfinanzas.exception.TooManyRequestsException.class,
            ()->almacen.crear(a.getId(),"CREATE_TRANSACTION","Ejemplo",datos));
        assertNotNull(almacen.crear(b.getId(),"CREATE_TRANSACTION","Ejemplo",datos).getId());
        assertEquals(new BigDecimal("100.00"),cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
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
    @Test void agregarCategoriaConservaDatosYConfirmacionGuardaUnaVez() {
        var categoria=categorias.crearCategoria(a.getId(),new CategoriaRequest("Comida",TipoTransaccion.GASTO,null,null));
        var p=propuesta();
        var datos=mapper.convertValue(p.data(),TransaccionRequest.class);
        var conCategoria=new TransaccionRequest(datos.cuentaId(),null,categoria.id(),datos.tipo(),datos.monto(),null,datos.fecha(),datos.descripcion(),datos.notas(),null,null,null,datos.listaId(),datos.etiquetas());
        var editada=acciones.editar(a.getId(),p.id(),p.version(),conCategoria);
        assertTrue(transacciones.listarRecientes(a.getId()).isEmpty());
        acciones.confirm(a.getId(),p.id(),editada.version());
        acciones.confirm(a.getId(),p.id(),editada.version());
        var guardadas=transacciones.listarRecientes(a.getId());
        assertEquals(1,guardadas.size());
        assertEquals(categoria.id(),guardadas.getFirst().categoriaId());
        assertEquals(new BigDecimal("25.00"),guardadas.getFirst().monto());
        assertEquals(datos.descripcion(),guardadas.getFirst().descripcion());
    }
    @Test void categoriaClasificadaYConfirmacionesConcurrentesGuardanUnaSolaVez() throws Exception {
        var categoria = categorias.crearCategoria(a.getId(), new CategoriaRequest("Comida ficticia", TipoTransaccion.GASTO, null, null));
        var original = propuesta();
        var clasificada = acciones.asignarCategoriaCaptura(a.getId(), original, categoria.id());
        assertThrows(IllegalArgumentException.class, () -> acciones.asignarCategoriaCaptura(b.getId(), original, categoria.id()));
        assertThrows(IllegalArgumentException.class, () -> acciones.confirm(a.getId(), original.id(), original.version()));
        var executor = Executors.newFixedThreadPool(2); var inicio = new CountDownLatch(1);
        try {
            var uno = executor.submit(() -> { inicio.await(); return acciones.confirm(a.getId(), clasificada.id(), clasificada.version()); });
            var dos = executor.submit(() -> { inicio.await(); return acciones.confirm(a.getId(), clasificada.id(), clasificada.version()); });
            inicio.countDown();
            assertEquals(uno.get(20, TimeUnit.SECONDS), dos.get(20, TimeUnit.SECONDS));
            assertEquals(1, transacciones.listarRecientes(a.getId()).size());
            assertEquals(categoria.id(), transacciones.listarRecientes(a.getId()).getFirst().categoriaId());
            assertEquals(new BigDecimal("75.00"), cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
        } finally { executor.shutdownNow(); assertTrue(executor.awaitTermination(10, TimeUnit.SECONDS)); }
    }
    @Test void capturaClasificadaConGroqSimuladoConservaEtiquetasYEsIdempotente() {
        var categoria = categorias.crearCategoria(a.getId(), new CategoriaRequest("Comida ficticia", TipoTransaccion.GASTO, null, null));
        org.mockito.Mockito.when(groq.isConfigured()).thenReturn(true);
        org.mockito.Mockito.when(groq.generateCaptura(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyInt()))
                .thenReturn("{\"categoriaId\":" + categoria.id() + ",\"etiquetas\":[\"almuerzo\"]}");
        var respuesta = asistente.quickCapture(a.getId(), new AiQuickCaptureRequest("Gaste 25 en empanadas desde Efectivo prueba", false, false));
        assertEquals("GROQ_CATEGORIA", respuesta.engine());
        org.mockito.Mockito.verify(groq).generateCaptura(org.mockito.ArgumentMatchers.argThat(prompt -> !prompt.contains("efectivo prueba") && prompt.contains("empanadas")), org.mockito.ArgumentMatchers.anyInt());
        var p = respuesta.action();
        assertEquals(categoria.id(), p.data().path("categoriaId").longValue());
        assertEquals("almuerzo", p.data().path("etiquetas").get(0).asText());
        assertTrue(transacciones.listarRecientes(a.getId()).isEmpty());
        acciones.confirm(a.getId(), p.id(), p.version());
        acciones.confirm(a.getId(), p.id(), p.version());
        assertEquals(1, transacciones.listarRecientes(a.getId()).size());
        assertEquals(new BigDecimal("75.00"), cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
    }
    @Test void frasesCotidianasConsultanGroqParaElConceptoDesconocido() {
        var categoria = categorias.crearCategoria(a.getId(), new CategoriaRequest("Comida ficticia", TipoTransaccion.GASTO, null, null));
        org.mockito.Mockito.when(groq.isConfigured()).thenReturn(true);
        org.mockito.Mockito.when(groq.generateCaptura(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyInt()))
                .thenReturn("{\"categoriaId\":" + categoria.id() + ",\"etiquetas\":[\"almuerzo\"]}");
        for (String texto : List.of("Me costaron 25 en empanadas", "Desembolsé 25 en empanadas", "Se me fueron 25 en empanadas")) {
            var respuesta = asistente.quickCapture(a.getId(), new AiQuickCaptureRequest(texto, false, false));
            assertEquals("GROQ_CATEGORIA", respuesta.engine());
            assertEquals(categoria.id(), respuesta.action().data().path("categoriaId").longValue());
            assertEquals(0, respuesta.action().data().path("monto").decimalValue().compareTo(new BigDecimal("25")));
            assertEquals(cuenta.getId().longValue(), respuesta.action().data().path("cuentaId").longValue());
        }
        assertTrue(transacciones.listarRecientes(a.getId()).isEmpty());
        org.mockito.Mockito.verify(groq, org.mockito.Mockito.times(3)).generateCaptura(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyInt());
    }
    @Test void noAsignaCategoriaDeOtroTipoNiDeOtroUsuario() {
        var otraCategoria = categorias.crearCategoria(b.getId(), new CategoriaRequest("Privada ficticia", TipoTransaccion.GASTO, null, null));
        var ingreso = categorias.crearCategoria(a.getId(), new CategoriaRequest("Ingreso ficticio", TipoTransaccion.INGRESO, null, null));
        var p = propuesta();
        assertThrows(IllegalArgumentException.class, () -> acciones.asignarCategoriaCaptura(a.getId(), p, otraCategoria.id()));
        assertThrows(IllegalArgumentException.class, () -> acciones.asignarCategoriaCaptura(a.getId(), p, ingreso.id()));
        assertTrue(transacciones.listarRecientes(a.getId()).isEmpty());
    }
    @Test void proveedorNoDisponibleConservaLaPropuestaSinGuardarMovimiento() {
        categorias.crearCategoria(a.getId(), new CategoriaRequest("Comida ficticia", TipoTransaccion.GASTO, null, null));
        org.mockito.Mockito.when(groq.isConfigured()).thenReturn(true);
        org.mockito.Mockito.when(groq.generateCaptura(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyInt()))
                .thenThrow(new AiProviderException("Tiempo de espera simulado"));
        var respuesta = asistente.quickCapture(a.getId(), new AiQuickCaptureRequest("Gaste 25 en empanadas desde Efectivo prueba", false, false));
        assertEquals("REGLAS", respuesta.engine());
        assertTrue(respuesta.action().data().path("categoriaId").isNull());
        assertEquals(1, acciones.pendientes(a.getId()).size());
        assertTrue(transacciones.listarRecientes(a.getId()).isEmpty());
        assertEquals(new BigDecimal("100.00"), cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
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
