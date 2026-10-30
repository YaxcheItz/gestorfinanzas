package com.gestionfinanzas.service;

import com.gestionfinanzas.ai.*;
import com.gestionfinanzas.dto.request.*;
import com.gestionfinanzas.model.entity.*;
import com.gestionfinanzas.model.enums.*;
import com.gestionfinanzas.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest @ActiveProfiles("test") @Transactional
class ListasEtiquetasIntegrationTest {
    @Autowired ListaService listas;
    @Autowired ListaRepository listaRepo;
    @Autowired ListaMiembroRepository miembros;
    @Autowired UsuarioRepository usuarios;
    @Autowired CuentaRepository cuentas;
    @Autowired CategoriaService categorias;
    @Autowired TransaccionService transacciones;
    @Autowired AiAssistantService asistente;
    @Autowired AiActionService acciones;
    @Autowired AiFinancialContextService contextoIa;
    @Autowired PresupuestoService presupuestos;
    @Autowired RespaldoFinancieroService respaldos;
    @Autowired RestauracionRespaldoService restauracion;
    Usuario a, b, tercero; Cuenta cuentaA, cuentaB; Long lista;
    @BeforeEach void preparar() {
        a=usuario("Ana"); b=usuario("Bruno"); tercero=usuario("Celia");
        cuentaA=cuenta(a); cuentaB=cuenta(b);
        listas.personal(a.getId()); listas.personal(b.getId());
        lista=listas.crear(a.getId(),new ListaRequest("Vacaciones","\uD83C\uDF34","MXN")).id();
    }
    Usuario usuario(String nombre) { return usuarios.save(Usuario.builder().nombre(nombre).email(UUID.randomUUID()+"@example.test").passwordHash("hash").build()); }
    Cuenta cuenta(Usuario u) {return cuentas.save(Cuenta.builder().usuario(u).nombre("Efectivo "+u.getNombre()).tipo(TipoCuenta.EFECTIVO).saldoActual(new BigDecimal("1000.00")).build());}
    TransaccionRequest gasto(Cuenta c, Long destino, String nombre, String... tags) {
        return new TransaccionRequest(c.getId(),null,null,TipoTransaccion.GASTO,new BigDecimal("25"),null,LocalDate.now(),nombre,null,null,null,null,destino,List.of(tags));
    }
    TransaccionFiltroRequest filtro(Long destino, String texto, Long autor) {
        return new TransaccionFiltroRequest(null,null,null,null,null,null,texto,null,null,null,destino,null,autor);
    }
    org.springframework.data.domain.Page<com.gestionfinanzas.dto.response.TransaccionResponse> buscar(Long usuario, Long destino, String texto, Long autor) {
        return transacciones.listarConFiltros(usuario,filtro(destino,texto,autor),PageRequest.of(0,10,Sort.by(Sort.Direction.DESC,"fecha","id")));
    }
    void invitar(String rol) {var invitacion=listas.invitar(a.getId(),lista,rol); listas.unirse(b.getId(),invitacion.codigo());}
    @Test void propietarioCambiaRolSinPerderHistorialNiTocarSaldos() {
        invitar("EDITOR");
        var movimiento=transacciones.crearTransaccion(b.getId(),gasto(cuentaB,lista,"Cena de Bruno"));
        var saldo=cuentas.findById(cuentaB.getId()).orElseThrow().getSaldoActual();
        var respuesta=listas.cambiarRol(a.getId(),lista,b.getId(),"LECTOR");
        assertEquals("LECTOR",respuesta.miembros().stream().filter(m->m.id().equals(b.getId())).findFirst().orElseThrow().rol());
        assertEquals(movimiento.id(),transacciones.obtenerPorId(b.getId(),movimiento.id()).id());
        assertEquals(saldo,cuentas.findById(cuentaB.getId()).orElseThrow().getSaldoActual());
        assertThrows(PermisoCompartidoException.class,()->listas.escribir(b.getId(),lista));
    }
    @Test void promoverLectorPermiteRegistrarSoloConFondosPropios() {
        invitar("LECTOR");
        listas.cambiarRol(a.getId(),lista,b.getId(),"EDITOR");
        transacciones.crearTransaccion(b.getId(),gasto(cuentaB,lista,"Propio"));
        assertThrows(IllegalArgumentException.class,()->transacciones.crearTransaccion(b.getId(),gasto(cuentaA,lista,"Ajeno")));
    }
    @Test void participanteNoPuedePromoverseNiCambiarAlPropietario() {
        invitar("LECTOR");
        assertThrows(PermisoCompartidoException.class,()->listas.cambiarRol(b.getId(),lista,b.getId(),"EDITOR"));
        assertThrows(PermisoCompartidoException.class,()->listas.cambiarRol(tercero.getId(),lista,b.getId(),"EDITOR"));
        assertThrows(IllegalArgumentException.class,()->listas.cambiarRol(a.getId(),lista,a.getId(),"LECTOR"));
    }
    @Test void rolInvalidoONoMiembroNoSeAceptan() {
        invitar("EDITOR");
        assertThrows(IllegalArgumentException.class,()->listas.cambiarRol(a.getId(),lista,b.getId(),"PROPIETARIO"));
        assertThrows(IllegalArgumentException.class,()->listas.cambiarRol(a.getId(),lista,tercero.getId(),"LECTOR"));
    }
    @Test void personalEsUnicaYRegistroAnteriorSiguePrivado() {
        assertEquals(listas.personal(a.getId()).getId(),listas.personal(a.getId()).getId());
        var t=transacciones.crearTransaccion(a.getId(),gasto(cuentaA,null,"Privado"));
        assertEquals(listas.personal(a.getId()).getId(),t.listaId());
        invitar("EDITOR");
        assertEquals(0,buscar(b.getId(),lista,null,null).getTotalElements());
        assertThrows(PermisoCompartidoException.class,()->listas.leer(b.getId(),t.listaId()));
    }
    @Test void lectorConsultaPeroNoRegistraNiEditaMovimientosAjenos() {
        var t=transacciones.crearTransaccion(a.getId(),gasto(cuentaA,lista,"Hotel","viaje","visa"));
        invitar("LECTOR");
        assertEquals(1,buscar(b.getId(),lista,"#viaje #visa",null).getTotalElements());
        assertEquals(t.id(),transacciones.obtenerPorId(b.getId(),t.id()).id());
        assertThrows(PermisoCompartidoException.class,()->listas.escribir(b.getId(),lista));
        assertThrows(IllegalArgumentException.class,()->transacciones.actualizarTransaccion(b.getId(),t.id(),gasto(cuentaB,lista,"Cambio")));
        assertThrows(IllegalArgumentException.class,()->transacciones.eliminarTransaccion(b.getId(),t.id()));
        assertEquals(new BigDecimal("1000.00"),cuentas.findById(cuentaB.getId()).orElseThrow().getSaldoActual());
    }
    @Test void filtroSinCategoriaDevuelveSoloMovimientosPropiosSinCategoria() {
        transacciones.crearTransaccion(a.getId(),gasto(cuentaA,null,"Sin categoría"));
        var categoria=categorias.crearCategoria(a.getId(),
                new CategoriaRequest("Comida",TipoTransaccion.GASTO,"🍽️","#123456"));
        var categorizada=transacciones.crearTransaccion(a.getId(),new TransaccionRequest(
                cuentaA.getId(),null,categoria.id(),TipoTransaccion.GASTO,new BigDecimal("25"),null,
                LocalDate.now(),"Con categoría",null,null,null,null,null,List.of()));
        var filtro=new TransaccionFiltroRequest(null,null,null,null,null,null,null,null,null,null,
                null,null,null,null,true);

        var resultado=transacciones.listarConFiltros(a.getId(),filtro,
                PageRequest.of(0,10,Sort.by(Sort.Direction.DESC,"fecha","id")));
        var csv=transacciones.exportarCsv(a.getId(),filtro);

        assertEquals(1,resultado.getTotalElements());
        assertNull(resultado.getContent().getFirst().categoriaId());
        assertFalse(csv.contains("Con categoría"));
        assertTrue(categorizada.id()>0);
    }
    @Test void evidenciaDePresupuestoIgualaElAlcanceListaMonedaCategoriaYPeriodo() {
        var categoria=categorias.crearCategoria(a.getId(),
                new CategoriaRequest("Comida",TipoTransaccion.GASTO,"🍽️","#123456"));
        transacciones.crearTransaccion(a.getId(),new TransaccionRequest(
                cuentaA.getId(),null,categoria.id(),TipoTransaccion.GASTO,new BigDecimal("35.50"),null,
                LocalDate.now(),"Cena en lista",null,null,null,null,lista,List.of()));
        transacciones.crearTransaccion(a.getId(),new TransaccionRequest(
                cuentaA.getId(),null,categoria.id(),TipoTransaccion.GASTO,new BigDecimal("80"),null,
                LocalDate.now(),"Cena personal",null,null,null,null,null,List.of()));
        var mes=LocalDate.now().getMonthValue();var anio=LocalDate.now().getYear();
        var presupuesto=presupuestos.crearOActualizarPresupuesto(a.getId(),
                new PresupuestoRequest(categoria.id(),new BigDecimal("500"),"MXN",mes,anio,lista,80));
        var inicio=LocalDate.now().withDayOfMonth(1);
        var evidencia=contextoIa.reporteLocal(a.getId(),"CATEGORIAS",inicio,inicio.withDayOfMonth(inicio.lengthOfMonth()),
                "MXN",null,categoria.id(),null,"Comida",lista,"Vacaciones").evidence().getFirst();

        assertEquals(new BigDecimal("35.50"),presupuesto.montoGastado());
        assertEquals(presupuesto.montoGastado(),evidencia.total());
        assertEquals(1,evidencia.operaciones());
        assertEquals(lista,evidencia.listaId());
        assertEquals(a.getId(),evidencia.autorId());
    }
    @Test void editorSoloUsaSuCuentaYBusquedaNoDuplicaPorEtiquetas() {
        invitar("EDITOR");
        transacciones.crearTransaccion(a.getId(),gasto(cuentaA,lista,"Hotel","viaje","visa"));
        transacciones.crearTransaccion(b.getId(),gasto(cuentaB,lista,"Cafe","viaje","efectivo"));
        assertEquals(2,buscar(a.getId(),lista,"#viaje",null).getTotalElements());
        assertEquals(1,buscar(a.getId(),lista,"#viaje #visa",null).getTotalElements());
        assertEquals(1,buscar(a.getId(),lista,"25",b.getId()).getTotalElements());
        assertEquals(0,buscar(a.getId(),lista,"%",null).getTotalElements());
        assertThrows(IllegalArgumentException.class,()->transacciones.crearTransaccion(b.getId(),gasto(cuentaA,lista,"Ajeno")));
    }
    @Test void busquedaHashtagNormalizaUnicodeIgualQueAlGuardar() {
        var movimiento=transacciones.crearTransaccion(a.getId(),gasto(cuentaA,lista,"Hotel", "\uFF36\uFF49\uFF41\uFF4A\uFF45"));
        assertEquals(Set.of("viaje"), movimiento.etiquetas());
        assertEquals(1,buscar(a.getId(),lista,"#\uFF36\uFF49\uFF41\uFF4A\uFF45",null).getTotalElements());
        assertEquals(1,buscar(a.getId(),lista,"#viaje",null).getTotalElements());
        assertEquals(1,buscar(a.getId(),lista,"HOTEL #\uFF36\uFF49\uFF41\uFF4A\uFF45",null).getTotalElements());
    }
    @Test void terceroNoAccedeAListaNiMovimientosPorId() {
        var t=transacciones.crearTransaccion(a.getId(),gasto(cuentaA,lista,"Hotel"));
        assertThrows(PermisoCompartidoException.class,()->buscar(tercero.getId(),lista,null,null));
        assertThrows(PermisoCompartidoException.class,()->transacciones.obtenerPorId(tercero.getId(),t.id()));
    }
    @Test void invitacionRevocadaNoPermiteEntrar() {
        var invitacion=listas.invitar(a.getId(),lista,"EDITOR");listas.revocar(a.getId(),lista);
        assertThrows(IllegalArgumentException.class,()->listas.unirse(b.getId(),invitacion.codigo()));
    }
    @Test void archivarBloqueaEscrituraYConservaHistorial() {
        invitar("EDITOR");transacciones.crearTransaccion(a.getId(),gasto(cuentaA,lista,"Hotel"));
        listas.archivar(a.getId(),lista,true);
        assertThrows(PermisoCompartidoException.class,()->listas.escribir(b.getId(),lista));
        assertEquals(1,buscar(b.getId(),lista,null,null).getTotalElements());
    }
    @Test void quitarMiembroRevocaLecturaSinBorrarSusMovimientos() {
        invitar("EDITOR");transacciones.crearTransaccion(b.getId(),gasto(cuentaB,lista,"Hotel"));
        listas.quitarMiembro(a.getId(),lista,b.getId());
        assertThrows(PermisoCompartidoException.class,()->listas.leer(b.getId(),lista));
        assertEquals(1,buscar(a.getId(),lista,null,null).getTotalElements());
    }
    @Test void capturaNaturalConservaListaEtiquetasYConfirmacionIdempotente() {
        var respuesta=asistente.quickCapture(a.getId(),new AiQuickCaptureRequest("Gasto 25 en Efectivo Ana #viaje",false,false,null,lista));
        var p=respuesta.action(); assertNotNull(p);
        assertEquals(lista.longValue(),p.data().get("listaId").asLong());
        assertEquals("viaje",p.data().get("etiquetas").get(0).asText());
        acciones.confirm(a.getId(),p.id(),p.version());acciones.confirm(a.getId(),p.id(),p.version());
        assertEquals(1,buscar(a.getId(),lista,"#viaje",null).getTotalElements());
    }
    @Test void respaldoActualRestauraListasYEtiquetasSinCompartirAcceso() {
        invitar("EDITOR");
        transacciones.crearTransaccion(a.getId(),gasto(cuentaA,lista,"Hotel","viaje","visa"));
        var respaldo=respaldos.generar(a.getId());assertEquals(7,respaldo.version());
        restauracion.restaurar(tercero.getId(),respaldo);
        var copias=listas.listar(tercero.getId());
        var viaje=copias.stream().filter(l->l.nombre().equals("Vacaciones")).findFirst().orElseThrow();
        assertEquals(1,viaje.miembros().size());assertNotEquals(lista,viaje.id());
        var t=buscar(tercero.getId(),viaje.id(),"#viaje #visa",null);
        assertEquals(1,t.getTotalElements());assertEquals(tercero.getId(),t.getContent().getFirst().autorId());
    }
    @Test void terceroNoRevocaInvitacionesQuitandoseDeUnaListaAjena() {
        assertThrows(PermisoCompartidoException.class,()->listas.quitarMiembro(tercero.getId(),lista,tercero.getId()));
    }
    @Test void respaldoIncluyeContextoDeMovimientosPropiosDespuesDeSalir() {
        invitar("EDITOR");transacciones.crearTransaccion(b.getId(),gasto(cuentaB,lista,"Hotel","viaje"));
        listas.quitarMiembro(a.getId(),lista,b.getId());
        var respaldo=respaldos.generar(b.getId());
        assertTrue(respaldo.listas().stream().anyMatch(l->l.id().equals(lista)));
    }

    @Test void lectorNoEditaNiEliminaRegistrosPropiosPreviosAlCambioDeRol() {
        invitar("EDITOR");var t=transacciones.crearTransaccion(b.getId(),gasto(cuentaB,lista,"Hotel"));
        miembros.findByListaIdAndUsuarioId(lista,b.getId()).orElseThrow().setRol("LECTOR");
        assertThrows(PermisoCompartidoException.class,()->transacciones.actualizarTransaccion(b.getId(),t.id(),gasto(cuentaB,null,"Cambio")));
        assertThrows(PermisoCompartidoException.class,()->transacciones.eliminarTransaccion(b.getId(),t.id()));
    }

    @Test void propuestaRevocadaNoSeGuardaEnPersonalNiMueveDinero() {
        invitar("EDITOR");
        var p=asistente.quickCapture(b.getId(),new AiQuickCaptureRequest("Gasto 25 en Efectivo Bruno #viaje",false,false,null,lista)).action();
        assertNotNull(p);listas.quitarMiembro(a.getId(),lista,b.getId());
        assertThrows(PermisoCompartidoException.class,()->acciones.confirm(b.getId(),p.id(),p.version()));
        assertTrue(transacciones.listarRecientes(b.getId()).isEmpty());
        assertEquals(new BigDecimal("1000.00"),cuentas.findById(cuentaB.getId()).orElseThrow().getSaldoActual());
    }

}
