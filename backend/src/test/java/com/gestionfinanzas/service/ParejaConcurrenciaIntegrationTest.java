package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.*;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.repository.*;
import com.gestionfinanzas.security.JwtUtil;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Sin transacción de clase: verifica commits reales, bloqueos y permisos HTTP. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ParejaConcurrenciaIntegrationTest {
    @Autowired ParejaService servicio;
    @Autowired UsuarioService borrar;
    @Autowired UsuarioRepository usuarios;
    @Autowired ParejaRepository parejas;
    @Autowired GastoParejaRepository gastos;
    @Autowired AportacionParejaRepository aportes;
    @Autowired RepartoGastoRepository repartos;
    @Autowired PagoParejaRepository pagos;
    @Autowired PasswordEncoder passwords;
    @Autowired PlatformTransactionManager manager;
    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwt;
    TransactionTemplate tx;
    Usuario a,b,c;

    @BeforeEach void preparar() {
        tx=new TransactionTemplate(manager);
        a=usuario("A"); b=usuario("B"); c=usuario("C");
    }
    Usuario usuario(String nombre) {
        return tx.execute(status -> usuarios.save(Usuario.builder().nombre(nombre)
                .email(UUID.randomUUID()+"@example.test").passwordHash(passwords.encode("password123")).build()));
    }
    @AfterEach void limpiar() {
        tx.executeWithoutResult(status -> {
            Set<Long> ids=new HashSet<>();
            for (Usuario u:List.of(a,b,c)) ids.addAll(parejas.listarIdsDeUsuario(u.getId()));
            for (Long id:ids) {
                repartos.deleteByParejaId(id); gastos.deleteByParejaId(id);
                aportes.deleteByParejaId(id); pagos.deleteByParejaId(id); parejas.deleteById(id);
            }
            for (Usuario u:List.of(a,b,c)) if (usuarios.existsById(u.getId())) usuarios.deleteById(u.getId());
        });
    }
    <T> List<T> simultaneas(Callable<T> primera,Callable<T> segunda) throws Exception {
        ExecutorService executor=Executors.newFixedThreadPool(2);
        CountDownLatch listas=new CountDownLatch(2),inicio=new CountDownLatch(1);
        try {
            var tareas=List.of(primera,segunda).stream().map(t -> executor.submit(() -> {
                listas.countDown(); if (!inicio.await(10,TimeUnit.SECONDS)) throw new AssertionError("Sin inicio concurrente");
                return t.call();
            })).toList();
            assertTrue(listas.await(10,TimeUnit.SECONDS)); inicio.countDown();
            List<T> resultados=new ArrayList<>();
            for (var tarea:tareas) resultados.add(tarea.get(20,TimeUnit.SECONDS));
            return resultados;
        } finally { executor.shutdownNow(); assertTrue(executor.awaitTermination(10,TimeUnit.SECONDS)); }
    }
    boolean acepta(Long id) {
        try { servicio.aceptar(b.getId(),id); return true; }
        catch (IllegalArgumentException esperada) { return false; }
    }
    String token(Usuario u) { return jwt.generarToken(u.getEmail(),u.getId(),u.getTokenVersion()); }

    @Test void dosAceptacionesDistintasNoCreanDosParejasActivas() throws Exception {
        var ab=servicio.crear(a.getId(),new ParejaCrearRequest(b.getEmail()));
        var cb=servicio.crear(c.getId(),new ParejaCrearRequest(b.getEmail()));
        var resultado=simultaneas(() -> acepta(ab.id()),() -> acepta(cb.id()));
        assertEquals(1,resultado.stream().filter(Boolean::booleanValue).count());
        assertEquals(1L,tx.execute(s -> parejas.contarActivasDeUsuario(b.getId())).longValue());
    }
    @Test void dobleAceptacionDeLaMismaInvitacionEsIdempotente() throws Exception {
        var ab=servicio.crear(a.getId(),new ParejaCrearRequest(b.getEmail()));
        assertEquals(List.of(true,true),simultaneas(() -> acepta(ab.id()),() -> acepta(ab.id())));
        assertEquals(1L,tx.execute(s -> parejas.contarActivasDeUsuario(b.getId())).longValue());
    }
    @Test void dosInvitacionesConcurrentesReutilizanLaMismaFila() throws Exception {
        var ids=simultaneas(() -> servicio.crear(a.getId(),new ParejaCrearRequest(b.getEmail())).id(),
                () -> servicio.crear(a.getId(),new ParejaCrearRequest(b.getEmail())).id());
        assertEquals(ids.getFirst(),ids.getLast());
        assertEquals(1,servicio.invitaciones(b.getId()).size());
    }
    @Test void desvincularYRegistrarNoDejanMovimientosPosterioresAlCierre() throws Exception {
        var ab=servicio.crear(a.getId(),new ParejaCrearRequest(b.getEmail())); servicio.aceptar(b.getId(),ab.id());
        var resultado=simultaneas(() -> {
            try { servicio.agregarGasto(a.getId(),new GastoParejaRequest(new BigDecimal("10.00"),
                    CalendarioFinanciero.hoy(),"Cena",com.gestionfinanzas.model.enums.TipoReparto.IGUAL,null,null)); return true; }
            catch (IllegalArgumentException cerrada) { return false; }
        },() -> { servicio.desvincular(b.getId(),ab.id()); return true; });
        assertTrue(resultado.getLast()); assertNull(servicio.obtener(a.getId()));
        assertEquals(new BigDecimal(resultado.getFirst()?"10.00":"0.00"),servicio.historial(a.getId(),ab.id()).resumen().totalGastado());
    }
    @Test void borrarCuentaYaceptarNoResucitanUnVinculo() throws Exception {
        var ab=servicio.crear(a.getId(),new ParejaCrearRequest(b.getEmail()));
        simultaneas(() -> { borrar.eliminarCuenta(a.getId(),new EliminarUsuarioRequest("password123")); return true; },
                () -> acepta(ab.id()));
        assertFalse(usuarios.existsById(a.getId())); assertTrue(usuarios.existsById(b.getId()));
        assertNull(servicio.obtener(b.getId()));
    }
    @Test void losPermisosSeAplicanPorHttpCon403YSinExponerFinanzas() throws Exception {
        mvc.perform(post("/api/pareja").header("Authorization","Bearer "+token(a))
                .contentType("application/json").content("{\"email\":\""+b.getEmail()+"\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.yo").doesNotExist())
                .andExpect(jsonPath("$.data.resumen").doesNotExist());
        Long id=servicio.invitaciones(b.getId()).getFirst().id();
        mvc.perform(post("/api/pareja/invitaciones/"+id+"/aceptar").header("Authorization","Bearer "+token(a)))
                .andExpect(status().isForbidden());
        servicio.aceptar(b.getId(),id);
        Long aporte=servicio.agregarAporte(a.getId(),new AportacionParejaRequest(new BigDecimal("10.00"),CalendarioFinanciero.hoy(),null)).aportes().getFirst().id();
        mvc.perform(delete("/api/pareja/aportes/"+aporte).header("Authorization","Bearer "+token(b)))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.success").value(false));
        servicio.desvincular(a.getId(),id);
        mvc.perform(get("/api/pareja/historial/"+id).header("Authorization","Bearer "+token(c)))
                .andExpect(status().isForbidden());
    }
    @Test void dosBorradosConcurrentesLimpianLasReferenciasHistoricas() throws Exception {
        var ab=servicio.crear(a.getId(),new ParejaCrearRequest(b.getEmail())); servicio.aceptar(b.getId(),ab.id());
        servicio.agregarGasto(a.getId(),new GastoParejaRequest(new BigDecimal("10.00"),CalendarioFinanciero.hoy(),
                "Cena",com.gestionfinanzas.model.enums.TipoReparto.IGUAL,null,null));
        simultaneas(() -> { borrar.eliminarCuenta(a.getId(),new EliminarUsuarioRequest("password123")); return true; },
                () -> { borrar.eliminarCuenta(b.getId(),new EliminarUsuarioRequest("password123")); return true; });
        assertFalse(usuarios.existsById(a.getId())); assertFalse(usuarios.existsById(b.getId()));
        assertFalse(parejas.existsById(ab.id()));
        assertTrue(usuarios.findAll().stream().noneMatch(Usuario::isReferenciaHistorica));
    }
}
