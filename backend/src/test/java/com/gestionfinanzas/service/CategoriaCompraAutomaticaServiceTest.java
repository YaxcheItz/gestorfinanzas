package com.gestionfinanzas.service;

import com.gestionfinanzas.model.entity.*;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CategoriaRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CategoriaCompraAutomaticaServiceTest {
    final Usuario user=Usuario.builder().id(71L).build();
    List<Categoria> catalog;
    CategoriaRepository repo;
    CategoriaCompraAutomaticaService service;
    Categoria add(Usuario owner,String name,TipoTransaccion type,boolean active) {
        var c=Categoria.builder().id(100L+catalog.size()).usuario(owner).nombre(name).tipo(type).activo(active).build();
        catalog.add(c);return c;
    }
    @BeforeEach void prepare() {
        catalog=new ArrayList<>();repo=mock(CategoriaRepository.class);service=new CategoriaCompraAutomaticaService(repo);
        when(repo.findDisponiblesParaUsuario(71L)).thenAnswer(a->List.copyOf(catalog));
        when(repo.findByUsuarioIdAndTipo(71L,TipoTransaccion.GASTO)).thenAnswer(a->catalog.stream()
            .filter(c->c.getUsuario()==user&&c.getTipo()==TipoTransaccion.GASTO).toList());
        when(repo.saveAndFlush(any())).thenAnswer(a->{Categoria c=a.getArgument(0);c.setId(100L+catalog.size());catalog.add(c);return c;});
    }
    @ParameterizedTest @CsvSource({
        "RESTAURANTE QA,Comida", "TAQUERÍA QA,Comida", "CAFÉ QA,Comida",
        "DLO UBER EATS,Comida", "UBER,Transporte", "UBER EATS FARMACIA,Otros gastos",
        "PAYPAL UBER EATS,Otros gastos", "UBEREATS QA,Comida",
        "RAPPI,Comida", "Rappi*COMERCIO QA,Comida", "RAPPI TURBO,Comida",
        "DIDI FOOD,Comida", "DIDIFOOD QA,Comida", "DiDi*Food,Comida",
        "UBER*EATS,Comida", "DIDI,Transporte", "DIDI TRIP,Transporte", "UBER TRIP,Transporte",
        "PEDIDOSYA,Comida", "PEDIDOS YA,Comida", "JUST EAT,Comida", "JUSTEAT,Comida",
        "DOORDASH,Comida", "DOOR DASH,Comida",
        "RAPPICARD,Otros gastos", "RAPPI CARD,Otros gastos", "RAPPIPAY,Otros gastos", "RAPPI PAY,Otros gastos",
        "RAPPI FARMACIA,Otros gastos", "RAPPI DIDI,Otros gastos", "DIDI FOOD FARMACIA,Otros gastos",
        "PAYPAL RAPPI,Otros gastos", "MERCADO PAGO DIDIFOOD,Otros gastos",
        "RAPPID QA,Otros gastos", "UBEREATSTORE QA,Otros gastos", "DIDIFOODLAND QA,Otros gastos",
        "SUPERMERCADO QA,Supermercado", "TAXI QA,Transporte", "FARMACIA QA,Salud",
        "ELECTRICIDAD QA,Hogar", "CINE QA,Ocio", "COMERCIO QA,Otros gastos",
        "RESTAURANTE FARMACIA QA,Otros gastos", "PANCAFETERA QA,Otros gastos",
        "PAYPAL RESTAURANTE QA,Otros gastos", "MERCADO PAGO QA,Otros gastos"})
    void recognizesWholeWordsOrFallsBack(String merchant,String expected) {
        Long id=service.asignar(user,merchant);
        var c=catalog.stream().filter(v->v.getId().equals(id)).findFirst().orElseThrow();
        assertEquals(expected,c.getNombre());assertSame(user,c.getUsuario());
        assertEquals(TipoTransaccion.GASTO,c.getTipo());assertTrue(c.isActivo());
    }
    @Test void reusesPersonalFoodEquivalentAndRespectsArchiveOrAmbiguity() {
        var personal=add(user,"Alimentación",TipoTransaccion.GASTO,true);
        assertEquals(personal.getId(),service.asignar(user,"RAPPI QA"));
        add(user,"Comida",TipoTransaccion.GASTO,true);
        Long ambiguous=service.asignar(user,"DIDI FOOD QA");
        assertEquals("Otros gastos",catalog.stream().filter(c->c.getId().equals(ambiguous)).findFirst().orElseThrow().getNombre());
        catalog.clear();personal=add(user,"Alimentación",TipoTransaccion.GASTO,false);
        Long archived=service.asignar(user,"UBEREATS QA");
        assertEquals("Otros gastos",catalog.stream().filter(c->c.getId().equals(archived)).findFirst().orElseThrow().getNombre());
        assertFalse(personal.isActivo());
    }
    @Test void reusesExistingGroceryNameAndNeverCreatesDuplicate() {
        var c=add(user,"Alimentos y Supermercado",TipoTransaccion.GASTO,true);
        assertEquals(c.getId(),service.asignar(user,"SUPERMERCADO QA"));
        verify(repo,never()).saveAndFlush(any());
    }
    @Test void globalCategoryIsUsedOnlyIfNoPersonalMatchOrOptOut() {
        var global=add(null,"Comida",TipoTransaccion.GASTO,true);
        assertEquals(global.getId(),service.asignar(user,"RESTAURANTE QA"));
        var own=add(user,"Restaurantes",TipoTransaccion.GASTO,true);
        assertEquals(own.getId(),service.asignar(user,"RESTAURANTE QA"));
        own.setActivo(false);
        var fallback=service.asignar(user,"RESTAURANTE QA");
        assertEquals("Otros gastos",catalog.stream().filter(c->c.getId().equals(fallback)).findFirst().orElseThrow().getNombre());
    }
    @Test void ambiguousGlobalOrPersonalCategoriesDoNotSelectFirstRow() {
        add(null,"Comida",TipoTransaccion.GASTO,true);add(null,"Restaurantes",TipoTransaccion.GASTO,true);
        var other=add(user,"Otros gastos",TipoTransaccion.GASTO,true);
        assertEquals(other.getId(),service.asignar(user,"RESTAURANTE QA"));
        add(user,"Comida",TipoTransaccion.GASTO,true);add(user,"Restaurantes",TipoTransaccion.GASTO,true);
        Collections.reverse(catalog);
        assertEquals(other.getId(),service.asignar(user,"RESTAURANTE QA"));
    }
    @Test void neverUsesIncomeInactiveOrAnotherUsersCategory() {
        add(user,"Comida",TipoTransaccion.INGRESO,true);add(null,"Comida",TipoTransaccion.GASTO,false);
        add(Usuario.builder().id(72L).build(),"Comida",TipoTransaccion.GASTO,true);
        var id=service.asignar(user,"RESTAURANTE QA");
        var result=catalog.stream().filter(c->c.getId().equals(id)).findFirst().orElseThrow();
        assertSame(user,result.getUsuario());assertTrue(result.isActivo());assertEquals(TipoTransaccion.GASTO,result.getTipo());
    }
    @Test void disabledOrAmbiguousFallbackIsNotReactivatedOrDuplicated() {
        add(user,"Otros gastos",TipoTransaccion.GASTO,false);
        assertNull(service.asignar(user,"DESCONOCIDO QA"));
        catalog.clear();add(user,"Otros gastos",TipoTransaccion.GASTO,true);add(user,"Otros",TipoTransaccion.GASTO,true);
        assertNull(service.asignar(user,"DESCONOCIDO QA"));verify(repo,never()).saveAndFlush(any());
    }
    @Test void missingMerchantIsUnknownAndRepeatedUnknownReusesFallback() {
        Long id=service.asignar(user,null);
        assertEquals(id,service.asignar(user,""));assertEquals(id,service.asignar(user,"DESCONOCIDO QA"));
        verify(repo,times(1)).saveAndFlush(any());
    }
}
