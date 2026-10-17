package com.gestionfinanzas.service;

import com.gestionfinanzas.controller.AvisoFinancieroController.*;
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
class AvisoFinancieroIntegrationTest {
    @Autowired AvisoFinancieroService service;
    @Autowired AvisoFinancieroRepository avisos;
    @Autowired UsuarioRepository usuarios;
    @Autowired CuentaRepository cuentas;
    @Autowired TransaccionRepository movimientos;
    @Autowired AuditoriaTransaccionRepository auditoria;
    @Autowired AsientoContableRepository asientos;
    @Autowired ListaService listas;
    @Autowired TransaccionService transacciones;
    @Autowired UsuarioService eliminar;
    @Autowired org.springframework.security.crypto.password.PasswordEncoder encoder;
    @Autowired jakarta.persistence.EntityManager entityManager;
    Usuario u,otro;Cuenta cuenta;Long lista;
    @BeforeEach void preparar(){
        u=usuario();otro=usuario();lista=listas.personal(u.getId()).getId();
        cuenta=cuentas.save(Cuenta.builder().usuario(u).nombre("Banco QA").tipo(TipoCuenta.DEBITO).moneda("MXN").saldoActual(new BigDecimal("1000.00")).build());
    }
    Usuario usuario(){return usuarios.save(Usuario.builder().nombre("QA avisos").email(UUID.randomUUID()+"@example.test").passwordHash("synthetic").build());}
    TransaccionRequest datos(){return new TransaccionRequest(cuenta.getId(),null,null,TipoTransaccion.GASTO,new BigDecimal("25.00"),null,CalendarioFinanciero.hoy(),"Tacos QA",null,null,null,null,lista,List.of());}
    Nuevo nuevo(String identificador,Origen origen,Clase clase,TransaccionRequest d){return new Nuevo(origen,identificador,"Aviso seleccionado",clase,"MXN",d,null);}
    AvisoFinancieroService.Vista recibir(){return service.recibir(u.getId(),nuevo("evento",Origen.GMAIL,Clase.COMPRA,datos()));}
    @Test void recibirYCorregirNoMueveDinero(){
        var a=recibir();assertEquals("PENDIENTE",a.estado());assertTrue(movimientos.findByUsuarioIdOrderByFechaDesc(u.getId(),org.springframework.data.domain.PageRequest.of(0,10)).isEmpty());
        var b=service.editar(u.getId(),a.id(),new Edicion(a.version(),Clase.AUTORIZACION,"MXN",datos()));assertTrue(b.version()>a.version());
        assertEquals(new BigDecimal("1000.00"),cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
    }
    @Test void recepcionRepetidaYConfirmacionRepetidaSonIdempotentes(){
        var a=recibir();assertEquals(a.id(),recibir().id());
        var guardado=service.confirmar(u.getId(),a.id(),new Decision(a.version(),false));
        assertEquals(guardado.transaccionId(),service.confirmar(u.getId(),a.id(),new Decision(a.version(),false)).transaccionId());
        assertEquals(new BigDecimal("975.00"),cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
        assertEquals(1,auditoria.findAllByUsuarioIdOrderByFechaEventoAscIdAsc(u.getId()).size());
    }
    @Test void mismoIdentificadorNoPermiteReemplazarContenido(){
        recibir();assertThrows(IllegalArgumentException.class,()->service.recibir(u.getId(),new Nuevo(Origen.GMAIL,"evento","Otro texto",Clase.COMPRA,"MXN",datos(),null)));
    }
    @Test void noPermiteAccesoCruzadoNiContextoAjeno(){
        var a=recibir();assertTrue(service.listar(otro.getId(),"PENDIENTE",0).isEmpty());
        assertThrows(IllegalArgumentException.class,()->service.confirmar(otro.getId(),a.id(),new Decision(a.version(),false)));
        assertThrows(IllegalArgumentException.class,()->service.recibir(otro.getId(),nuevo("ajeno",Origen.MANUAL,Clase.COMPRA,datos())));
    }
    @Test void descartarConservaHuellaYNoRegistraDinero(){
        var a=recibir();service.descartar(u.getId(),a.id(),a.version());assertEquals("DESCARTADO",recibir().estado());
        assertThrows(IllegalArgumentException.class,()->service.confirmar(u.getId(),a.id(),new Decision(a.version(),false)));
    }
    @Test void unaEdicionObsoletaNoPisaLaRevisionNueva(){
        var a=recibir();service.editar(u.getId(),a.id(),new Edicion(a.version(),Clase.AUTORIZACION,"MXN",datos()));
        assertThrows(IllegalArgumentException.class,()->service.editar(u.getId(),a.id(),new Edicion(a.version(),Clase.COMPRA,"MXN",datos())));
    }
    @Test void coincidenciaEntreCanalesNecesitaDecisionExplicita(){
        var a=recibir();service.confirmar(u.getId(),a.id(),new Decision(a.version(),false));
        var b=service.recibir(u.getId(),nuevo("mensaje",Origen.WHATSAPP,Clase.COMPRA,datos()));assertEquals(1,b.coincidencias().size());
        assertThrows(IllegalArgumentException.class,()->service.confirmar(u.getId(),b.id(),new Decision(b.version(),false)));
        service.confirmar(u.getId(),b.id(),new Decision(b.version(),true));assertEquals(new BigDecimal("950.00"),cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
    }
    @Test void comparaTambienConRegistroManual(){
        transacciones.crearTransaccion(u.getId(),datos());assertEquals(1,recibir().coincidencias().size());
    }
    @Test void autorizacionPendienteNoEsCargo(){
        var a=service.recibir(u.getId(),nuevo("hold",Origen.GMAIL,Clase.AUTORIZACION,datos()));
        assertThrows(IllegalArgumentException.class,()->service.confirmar(u.getId(),a.id(),new Decision(a.version(),false)));
        assertEquals(new BigDecimal("1000.00"),cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
    }
    @Test void monedaDistintaNoSeConvierteSilenciosamente(){
        assertThrows(IllegalArgumentException.class,()->service.recibir(u.getId(),new Nuevo(Origen.GMAIL,"usd","Compra",Clase.COMPRA,"USD",datos(),null)));
    }
    @Test void datosIncompletosQuedanPendientesYNoSeConfirman(){
        var a=service.recibir(u.getId(),nuevo("incompleto",Origen.MANUAL,Clase.COMPRA,null));
        assertThrows(IllegalArgumentException.class,()->service.confirmar(u.getId(),a.id(),new Decision(a.version(),false)));
    }
    @Test void codigosDeSeguridadNoSeConservan(){
        assertThrows(IllegalArgumentException.class,()->service.recibir(u.getId(),new Nuevo(Origen.GMAIL,"secreto","OTP 123456",Clase.COMPRA,"MXN",null,null)));
    }
    @Test void devolucionEsIngresoYPagoDeTarjetaEsTransferencia(){
        var ingreso=new TransaccionRequest(cuenta.getId(),null,null,TipoTransaccion.INGRESO,new BigDecimal("25.00"),null,CalendarioFinanciero.hoy(),"Devolucion QA",null,null,null,null,lista,List.of());
        var a=service.recibir(u.getId(),nuevo("devolucion",Origen.GMAIL,Clase.DEVOLUCION,ingreso));service.confirmar(u.getId(),a.id(),new Decision(a.version(),false));
        assertEquals(new BigDecimal("1025.00"),cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
        var tarjeta=cuentas.save(Cuenta.builder().usuario(u).nombre("Credito QA").tipo(TipoCuenta.CREDITO).moneda("MXN").saldoActual(new BigDecimal("-100.00")).limiteCredito(new BigDecimal("1000.00")).build());
        var pago=new TransaccionRequest(cuenta.getId(),tarjeta.getId(),null,TipoTransaccion.TRANSFERENCIA,new BigDecimal("25.00"),null,CalendarioFinanciero.hoy(),"Pago QA",null,null,null,null,lista,List.of());
        var b=service.recibir(u.getId(),nuevo("pago",Origen.GMAIL,Clase.PAGO_TARJETA,pago));service.confirmar(u.getId(),b.id(),new Decision(b.version(),false));
        assertEquals(new BigDecimal("1000.00"),cuentas.findById(cuenta.getId()).orElseThrow().getSaldoActual());
        assertEquals(new BigDecimal("-75.00"),cuentas.findById(tarjeta.getId()).orElseThrow().getSaldoActual());
        assertEquals(2,asientos.findAllByUsuarioIdOrderByFechaOperacionAscIdAsc(u.getId()).size());
    }
    @Test void borrarCuentaEliminaAvisosPropios(){
        var a=recibir();u.setPasswordHash(encoder.encode("Password123"));usuarios.saveAndFlush(u);
        eliminar.eliminarCuenta(u.getId(),new com.gestionfinanzas.dto.request.EliminarUsuarioRequest("Password123"));
        entityManager.flush();entityManager.clear();assertFalse(avisos.existsById(a.id()));
    }
}
