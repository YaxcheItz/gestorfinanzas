package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.*;
import com.gestionfinanzas.model.entity.*;
import com.gestionfinanzas.model.enums.*;
import com.gestionfinanzas.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest @ActiveProfiles("test") @Transactional
class PresupuestosRecurrenciasCierreIntegrationTest {
    @Autowired UsuarioRepository usuarios;
    @Autowired com.fasterxml.jackson.databind.ObjectMapper mapper;
    @Autowired CuentaRepository cuentas;
    @Autowired CategoriaRepository categorias;
    @Autowired PlantillaRecurrenteRepository plantillasRepo;
    @Autowired TransaccionRepository movimientos;
    @Autowired AuditoriaTransaccionRepository auditoria;
    @Autowired AsientoContableRepository asientos;
    @Autowired ListaService listas;
    @Autowired PresupuestoService presupuestos;
    @Autowired TransaccionService transacciones;
    @Autowired PlantillaRecurrenteService recurrencias;
    @Autowired RespaldoFinancieroService respaldos;
    @Autowired RestauracionRespaldoService restauracion;
    Usuario usuario, destino; Cuenta cuenta; Categoria categoria; Long personal, viaje; LocalDate hoy;
    @BeforeEach void preparar() {
        usuario=crearUsuario();destino=crearUsuario();hoy=CalendarioFinanciero.hoy();
        cuenta=cuentas.save(Cuenta.builder().usuario(usuario).nombre("Banco").tipo(TipoCuenta.DEBITO).saldoActual(new BigDecimal("1000.00")).build());
        categoria=categorias.save(Categoria.builder().usuario(usuario).nombre("Comida").tipo(TipoTransaccion.GASTO).build());
        personal=listas.personal(usuario.getId()).getId();
        viaje=listas.crear(usuario.getId(),new ListaRequest("Viaje","x","MXN")).id();
    }
    Usuario crearUsuario() {return usuarios.save(Usuario.builder().nombre("QA cierre").email(UUID.randomUUID()+"@example.test").passwordHash("synthetic").build());}
    TransaccionRequest solicitud(Long lista, Long categoriaId, FrecuenciaRecurrencia frecuencia, LocalDate fin, ModoEdicionRecurrencia modo) {
        return new TransaccionRequest(cuenta.getId(),null,categoriaId,TipoTransaccion.GASTO,new BigDecimal("25.00"),null,frecuencia==null?hoy:hoy.minusDays(1),"Prueba",null,frecuencia,frecuencia==null?null:hoy,null,lista,List.of("viaje"),modo,fin);
    }
    void presupuesto(Long lista,int alerta) {presupuestos.crearOActualizarPresupuesto(usuario.getId(),new PresupuestoRequest(categoria.getId(),new BigDecimal("100.00"),"MXN",hoy.getMonthValue(),hoy.getYear(),lista,alerta));}
    @Test void disponibleNuncaUsaPresupuestoDeOtraLista() {
        presupuesto(viaje,70);
        assertFalse(presupuestos.obtenerDisponibleCategoria(usuario.getId(),categoria.getId(),personal,hoy,"MXN").tienePresupuesto());
    }
    @Test void disponibleNoComparaMonedasDiferentes() {
        presupuesto(personal,70);
        assertFalse(presupuestos.obtenerDisponibleCategoria(usuario.getId(),categoria.getId(),personal,hoy,"USD").tienePresupuesto());
    }
    @Test void respaldoConservaPresupuestosPorListaUmbralesFechaFinalYVinculos() {
        presupuesto(personal,65);presupuesto(viaje,90);
        var creado=transacciones.crearTransaccion(usuario.getId(),solicitud(viaje,categoria.getId(),FrecuenciaRecurrencia.MENSUAL,hoy.plusMonths(3),null));
        var respaldo=respaldos.generar(usuario.getId());
        restauracion.restaurar(destino.getId(),respaldo);
        var resumen=presupuestos.obtenerResumenPeriodo(destino.getId(),hoy.getMonthValue(),hoy.getYear());
        assertEquals(2,resumen.presupuestos().size());
        assertEquals(Set.of(65,90),resumen.presupuestos().stream().map(p->p.porcentajeAlerta()).collect(java.util.stream.Collectors.toSet()));
        assertEquals(2,resumen.presupuestos().stream().map(p->p.listaId()).distinct().count());
        var serie=plantillasRepo.findAllByUsuarioIdOrderBySiguienteFechaAsc(destino.getId()).getFirst();
        assertEquals(hoy.plusMonths(3),serie.getFechaFin());
        var copia=movimientos.findAllByUsuarioIdOrderByFechaAscIdAsc(destino.getId()).getFirst();
        assertNotNull(copia.getPlantillaRecurrente());assertEquals(serie.getId(),copia.getPlantillaRecurrente().getId());
        assertNotEquals(creado.plantillaId(),serie.getId());
    }
    @Test void todaLaSerieActualizaAuditoriaYContabilidadDeCadaMovimiento() {
        var inicial=transacciones.crearTransaccion(usuario.getId(),solicitud(personal,categoria.getId(),FrecuenciaRecurrencia.MENSUAL,hoy.plusMonths(3),null));
        recurrencias.registrarSiguiente(usuario.getId(),inicial.plantillaId());
        var otra=categorias.save(Categoria.builder().usuario(usuario).nombre("Restaurantes").tipo(TipoTransaccion.GASTO).build());
        transacciones.actualizarTransaccion(usuario.getId(),inicial.id(),new TransaccionRequest(cuenta.getId(),null,otra.getId(),TipoTransaccion.GASTO,new BigDecimal("60.00"),null,hoy,"Cambio",null,null,null,null,personal,List.of("viaje"),ModoEdicionRecurrencia.TODA_LA_SERIE,null));
        var eventos=auditoria.findAllByUsuarioIdOrderByFechaEventoAscIdAsc(usuario.getId());
        assertEquals(2,eventos.stream().filter(a->a.getAccion().equals("ACTUALIZAR")).count());
        assertEquals(4,asientos.findAllByUsuarioIdOrderByFechaOperacionAscIdAsc(usuario.getId()).size());
        var diario=asientos.findAllByUsuarioIdOrderByFechaOperacionAscIdAsc(usuario.getId());
        var neto=diario.stream().flatMap(a->a.getLineas().stream()).filter(l->otra.getId().equals(l.getCategoriaId()))
                .map(l->l.getLado()==LadoContable.DEBE?l.getMonto():l.getMonto().negate()).reduce(BigDecimal.ZERO,BigDecimal::add);
        assertEquals(new BigDecimal("85.00"),neto);
        assertEquals(new BigDecimal("915.00"),cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
    }
    @Test void noRegistraUnaOcurrenciaFueraDeFechaFinal() {
        var t=transacciones.crearTransaccion(usuario.getId(),solicitud(personal,categoria.getId(),FrecuenciaRecurrencia.MENSUAL,hoy,null));
        var serie=plantillasRepo.findById(t.plantillaId()).orElseThrow();serie.setFechaFin(hoy.minusDays(1));
        assertThrows(IllegalArgumentException.class,()->recurrencias.registrarSiguiente(usuario.getId(),serie.getId()));
        assertEquals(new BigDecimal("975.00"),cuenta.getSaldoActual());
    }
    @Test void noReactivaUnaSerieQueYaTermino() {
        var t=transacciones.crearTransaccion(usuario.getId(),solicitud(personal,categoria.getId(),FrecuenciaRecurrencia.MENSUAL,hoy,null));
        recurrencias.actualizarFechaFin(usuario.getId(),t.plantillaId(),hoy.minusDays(1));
        assertThrows(IllegalArgumentException.class,()->recurrencias.cambiarEstado(usuario.getId(),t.plantillaId(),true));
    }
    @Test void rechazaFechaFinalAnteriorAlInicioSinMoverDinero() {
        assertThrows(IllegalArgumentException.class,()->transacciones.crearTransaccion(usuario.getId(),solicitud(personal,categoria.getId(),FrecuenciaRecurrencia.MENSUAL,hoy.minusDays(1),null)));
        assertEquals(new BigDecimal("1000.00"),cuenta.getSaldoActual());
    }
    @Test void restauraVersion4ConPresupuestoPersonalYUmbralPredeterminado() throws Exception {
        presupuesto(personal,65);
        var json=mapper.valueToTree(respaldos.generar(usuario.getId()));
        ((com.fasterxml.jackson.databind.node.ObjectNode)json).put("version",4);
        var p=(com.fasterxml.jackson.databind.node.ObjectNode)json.get("presupuestos").get(0);p.remove("listaId");p.remove("porcentajeAlerta");
        restauracion.restaurar(destino.getId(),mapper.treeToValue(json,com.gestionfinanzas.dto.response.RespaldoFinancieroResponse.class));
        var copia=presupuestos.obtenerResumenPeriodo(destino.getId(),hoy.getMonthValue(),hoy.getYear()).presupuestos().getFirst();
        assertEquals(80,copia.porcentajeAlerta());assertEquals(listas.personal(destino.getId()).getId(),copia.listaId());
    }
    @Test void rechazaReferenciaDeRecurrenciaExternaAntesDeRestaurar() throws Exception {
        transacciones.crearTransaccion(usuario.getId(),solicitud(personal,categoria.getId(),null,null,null));
        var json=mapper.valueToTree(respaldos.generar(usuario.getId()));
        ((com.fasterxml.jackson.databind.node.ObjectNode)json.get("transacciones").get(0)).put("plantillaId",Long.MAX_VALUE);
        assertThrows(IllegalArgumentException.class,()->restauracion.restaurar(destino.getId(),mapper.treeToValue(json,com.gestionfinanzas.dto.response.RespaldoFinancieroResponse.class)));
        assertTrue(cuentas.findByUsuarioIdOrderByActivoDescNombreAsc(destino.getId()).isEmpty());
    }

    @Test void moverTodaLaSerieConservaContextoDeCashbackSinCambiarSaldoHistorico() {
        cuenta.setCashbackPorcentaje(new BigDecimal("10.00"));
        var inicial=transacciones.crearTransaccion(usuario.getId(),solicitud(personal,categoria.getId(),FrecuenciaRecurrencia.MENSUAL,hoy.plusMonths(3),null));
        recurrencias.registrarSiguiente(usuario.getId(),inicial.plantillaId());
        var saldo=cuenta.getSaldoActual();
        transacciones.actualizarTransaccion(usuario.getId(),inicial.id(),solicitud(viaje,categoria.getId(),null,null,ModoEdicionRecurrencia.TODA_LA_SERIE));
        var automaticos=movimientos.findAllByUsuarioIdOrderByFechaAscIdAsc(usuario.getId()).stream().filter(t->t.getCashbackOrigen()!=null).toList();
        assertEquals(2,automaticos.size());assertTrue(automaticos.stream().allMatch(t->viaje.equals(t.getLista().getId())));
        assertEquals(saldo,cuenta.getSaldoActual());
    }
    @Test void noReclasificaGastosHistoricosConUnaCategoriaDeIngreso() {
        var inicial=transacciones.crearTransaccion(usuario.getId(),solicitud(personal,categoria.getId(),FrecuenciaRecurrencia.MENSUAL,hoy.plusMonths(3),null));
        recurrencias.registrarSiguiente(usuario.getId(),inicial.plantillaId());
        var ingreso=categorias.save(Categoria.builder().usuario(usuario).nombre("Salario").tipo(TipoTransaccion.INGRESO).build());
        var peticion=new TransaccionRequest(cuenta.getId(),null,ingreso.getId(),TipoTransaccion.INGRESO,new BigDecimal("25.00"),null,hoy,"Cambio",null,null,null,null,personal,List.of(),ModoEdicionRecurrencia.TODA_LA_SERIE,null);
        assertThrows(IllegalArgumentException.class,()->transacciones.actualizarTransaccion(usuario.getId(),inicial.id(),peticion));
    }

}
