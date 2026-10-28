package com.gestionfinanzas.service;

import com.gestionfinanzas.controller.AvisoFinancieroController.*;
import com.gestionfinanzas.dto.request.AutomatizacionAndroidRequest.*;
import com.gestionfinanzas.dto.request.TransaccionRequest;
import com.gestionfinanzas.model.entity.*;
import com.gestionfinanzas.model.enums.*;
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
class CategoriaCompraAutomaticaIntegrationTest {
    @Autowired org.springframework.test.web.servlet.MockMvc mvc;
    @Autowired com.fasterxml.jackson.databind.ObjectMapper mapper;
    @Autowired AutomatizacionAndroidService service;
    @Autowired AvisoFinancieroService avisos;
    @Autowired UsuarioRepository usuarios;
    @Autowired CuentaRepository cuentas;
    @Autowired CategoriaRepository categorias;
    @Autowired TransaccionRepository movimientos;
    @Autowired ListaService listas;
    Usuario usuario; Cuenta cuenta; Long lista;
    UUID rule=UUID.randomUUID();
    @BeforeEach void prepare() {
        usuario=usuarios.saveAndFlush(Usuario.builder().nombre("QA categorias")
            .email(UUID.randomUUID()+"@example.test").passwordHash("synthetic").build());
        lista=listas.personal(usuario.getId()).getId();
        cuenta=cuentas.saveAndFlush(Cuenta.builder().usuario(usuario).nombre("Banco QA").tipo(TipoCuenta.DEBITO)
            .moneda("MXN").saldoActual(new BigDecimal("1000.00")).build());
    }
    String connect(Long category) {
        var r=new Regla(rule,"REVOLUT","com.revolut.revolut",null,null,cuenta.getId(),lista,category);
        return service.configurar(usuario.getId(),new Configuracion(UUID.randomUUID(),true,List.of(r))).clave();
    }
    Evento event(String id,String description,String amount) {
        return new Evento(rule,id.repeat(64),Clase.COMPRA,"MXN",new BigDecimal(amount),CalendarioFinanciero.hoy(),description);
    }
    Categoria category(Usuario owner,String name,TipoTransaccion type,boolean active) {
        return categorias.saveAndFlush(Categoria.builder().usuario(owner).nombre(name).tipo(type).activo(active).build());
    }
    String categoryName(Long id) { assertNotNull(id);return categorias.findById(id).orElseThrow().getNombre(); }
    @Test void restaurantCreatesFoodAndRedeliveryPreservesManualCorrection() {
        String key=connect(null);var e=event("a","RESTAURANTE QA","25.00");
        var first=service.recibir(key,e);assertEquals("REGISTRADO",first.estado());
        assertEquals("Comida",categoryName(first.datos().categoriaId()));
        var food=categorias.findById(first.datos().categoriaId()).orElseThrow();
        food.setActivo(false);categorias.saveAndFlush(food);
        var manual=category(usuario,"Viajes",TipoTransaccion.GASTO,true);
        var transaction=movimientos.findById(first.transaccionId()).orElseThrow();
        transaction.setCategoria(manual);movimientos.saveAndFlush(transaction);
        long count=categorias.count();var replay=service.recibir(key,e);
        assertEquals(first.transaccionId(),replay.transaccionId());assertEquals(count,categorias.count());
        assertEquals(manual.getId(),movimientos.findById(first.transaccionId()).orElseThrow().getCategoria().getId());
        assertEquals(new BigDecimal("975.00"),cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
    }
    @Test void unknownAndAmbiguousPurchasesUseOneOtherExpensesCategory() {
        String key=connect(null);
        var first=service.recibir(key,event("a","COMERCIO QA","25.00"));
        var second=service.recibir(key,event("b","RESTAURANTE FARMACIA QA","27.00"));
        assertEquals("Otros gastos",categoryName(first.datos().categoriaId()));
        assertEquals(first.datos().categoriaId(),second.datos().categoriaId());
        assertEquals(1,categorias.findByUsuarioIdAndTipo(usuario.getId(),TipoTransaccion.GASTO).size());
    }
    @Test void personalCategoryWinsOverGlobalAndAnotherUsersCategory() {
        var own=category(usuario,"Restaurantes",TipoTransaccion.GASTO,true);
        category(null,"Comida",TipoTransaccion.GASTO,true);
        var other=usuarios.saveAndFlush(Usuario.builder().nombre("Otro QA").email(UUID.randomUUID()+"@example.test").passwordHash("synthetic").build());
        category(other,"Comida",TipoTransaccion.GASTO,true);
        assertEquals(own.getId(),service.recibir(connect(null),event("a","CAFETERIA QA","25.00")).datos().categoriaId());
    }
    @Test void explicitRuleCategoryAlwaysWins() {
        var manual=category(usuario,"Viajes",TipoTransaccion.GASTO,true);
        var result=service.recibir(connect(manual.getId()),event("a","RESTAURANTE QA","25.00"));
        assertEquals(manual.getId(),result.datos().categoriaId());
        assertEquals(1,categorias.findByUsuarioIdAndTipo(usuario.getId(),TipoTransaccion.GASTO).size());
    }
    @Test void legacyReceiptIsNotReclassifiedOrChargedAgain() {
        String key=connect(null);var e=event("a","RESTAURANTE QA","25.00");
        var data=new TransaccionRequest(cuenta.getId(),null,null,TipoTransaccion.GASTO,e.monto(),null,e.fecha(),e.descripcion(),null,null,null,null,lista,List.of());
        var legacy=avisos.recibir(usuario.getId(),new Nuevo(Origen.NOTIFICACION,"android-auto:"+cuenta.getId()+":"+e.eventoId(),e.descripcion(),e.clase(),e.moneda(),data,null));
        var saved=avisos.confirmar(usuario.getId(),legacy.id(),new Decision(legacy.version(),false));
        var replay=service.recibir(key,e);
        assertEquals(saved.transaccionId(),replay.transaccionId());assertNull(replay.datos().categoriaId());
        assertTrue(categorias.findByUsuarioIdAndTipo(usuario.getId(),TipoTransaccion.GASTO).isEmpty());
    }
    @Test void archivedCategoryIsNotReactivatedOrDuplicated() {
        var archived=category(usuario,"Comida",TipoTransaccion.GASTO,false);
        var result=service.recibir(connect(null),event("a","RESTAURANTE QA","25.00"));
        assertEquals("Otros gastos",categoryName(result.datos().categoriaId()));
        assertFalse(categorias.findById(archived.getId()).orElseThrow().isActivo());
        assertEquals(2,categorias.findByUsuarioIdAndTipo(usuario.getId(),TipoTransaccion.GASTO).size());
    }
    @Test void disabledFallbackDoesNotPreventExpenseOrReactivateUserCategory() {
        var archived=category(usuario,"Otros gastos",TipoTransaccion.GASTO,false);
        var result=service.recibir(connect(null),event("a","COMERCIO QA","25.00"));
        assertEquals("REGISTRADO",result.estado());assertNull(result.datos().categoriaId());
        assertFalse(categorias.findById(archived.getId()).orElseThrow().isActivo());
    }
    @Test void changedPayloadIsRejectedWithoutCreatingAnotherCategory() {
        String key=connect(null);service.recibir(key,event("a","RESTAURANTE QA","25.00"));
        long count=categorias.count();
        assertThrows(IllegalArgumentException.class,()->service.recibir(key,event("a","FARMACIA QA","25.00")));
        assertEquals(count,categorias.count());
    }
    @Test void incomeIsNotAssignedAnExpenseCategory() {
        var consented=new Regla(rule,"REVOLUT","com.revolut.revolut",null,null,cuenta.getId(),lista,null,true);
        String key=service.configurar(usuario.getId(),new Configuracion(UUID.randomUUID(),true,List.of(consented))).clave();
        var income=new Evento(rule,"a".repeat(64),Clase.INGRESO,"MXN",new BigDecimal("25.00"),CalendarioFinanciero.hoy(),"RESTAURANTE QA");
        assertNull(service.recibir(key,income).datos().categoriaId());
        assertTrue(categorias.findByUsuarioIdAndTipo(usuario.getId(),TipoTransaccion.GASTO).isEmpty());
    }
    @Test void conflictingPersonalCategoriesFallBackWithoutPickingFirstRow() {
        category(usuario,"Comida",TipoTransaccion.GASTO,true);category(usuario,"Restaurantes",TipoTransaccion.GASTO,true);
        var result=service.recibir(connect(null),event("a","RESTAURANTE QA","25.00"));
        assertEquals("Otros gastos",categoryName(result.datos().categoriaId()));
    }
    @Test void httpReceiptReturnsAssignedCategoryAndCannotTakeCategoryFromPayload() throws Exception {
        String key=connect(null);
        var body=mapper.valueToTree(event("a","RESTAURANTE QA","25.00"));
        ((com.fasterxml.jackson.databind.node.ObjectNode)body).put("categoriaId",999999);
        var result=mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/canales/android/evento")
            .header("X-Kaptal-Android",key).contentType("application/json").content(mapper.writeValueAsString(body)))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.data.estado").value("REGISTRADO"))
            .andReturn();
        long category=mapper.readTree(result.getResponse().getContentAsString()).path("data").path("datos").path("categoriaId").asLong();
        assertEquals("Comida",categoryName(category));assertNotEquals(999999,category);
        assertEquals(usuario.getId(),categorias.findById(category).orElseThrow().getUsuario().getId());
    }
}
