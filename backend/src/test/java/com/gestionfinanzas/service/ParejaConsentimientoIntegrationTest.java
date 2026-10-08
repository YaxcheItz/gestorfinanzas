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
import org.springframework.security.crypto.password.PasswordEncoder;
import java.math.BigDecimal;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ParejaConsentimientoIntegrationTest {
    @Autowired ParejaService servicio;
    @Autowired UsuarioRepository usuarios;
    @Autowired ParejaRepository parejas;
    @Autowired GastoParejaRepository gastos;
    @Autowired PagoParejaRepository pagos;
    @Autowired UsuarioService eliminarUsuario;
    @Autowired RespaldoFinancieroService respaldos;
    @Autowired RestauracionRespaldoService restauracion;
    @Autowired PasswordEncoder passwords;
    Usuario ana, luis, tercero;
    @BeforeEach void preparar() {
        ana=usuario("Ana"); luis=usuario("Luis"); tercero=usuario("Tercero");
    }
    Usuario usuario(String nombre) {
        return usuarios.save(Usuario.builder().nombre(nombre).email(UUID.randomUUID()+"@example.test")
                .passwordHash(passwords.encode("password123")).rol(RolUsuario.ROLE_USER).activo(true).build());
    }
    Pareja aceptada() {
        return parejas.save(Pareja.builder().usuarioA(ana).usuarioB(luis).activa(true).build());
    }
    GastoParejaRequest gasto(String monto) {
        return new GastoParejaRequest(new BigDecimal(monto),CalendarioFinanciero.hoy(),"Cena",TipoReparto.IGUAL,null,null);
    }
    @Test void invitacionConservaDatosOriginalesAunqueCambienLosPerfiles() {
        String correoAna=ana.getEmail(), correoLuis=luis.getEmail();
        var invitacion=servicio.crear(ana.getId(),new ParejaCrearRequest(correoLuis));
        ana.setNombre("Nombre privado nuevo");
        ana.setEmail(UUID.randomUUID()+"@example.test");
        luis.setEmail(UUID.randomUUID()+"@example.test");
        usuarios.saveAndFlush(ana); usuarios.saveAndFlush(luis);
        var pendiente=servicio.invitaciones(luis.getId()).getFirst();
        assertEquals("Ana",pendiente.remitenteNombre());
        assertEquals(correoAna,pendiente.remitenteEmail());
        assertEquals(correoLuis,pendiente.destinatarioEmail());
        assertEquals(correoAna,servicio.aceptar(luis.getId(),invitacion.id()).pareja().email());
    }
    @Test void restaurarUsaElPerfilDelArchivoSinVincularLaCuentaReal() {
        var invitacion=servicio.crear(ana.getId(),new ParejaCrearRequest(luis.getEmail()));
        servicio.aceptar(luis.getId(),invitacion.id());
        servicio.agregarGasto(ana.getId(),gasto("10.00"));
        var archivo=respaldos.generar(ana.getId());
        luis.setNombre("Nombre privado posterior"); usuarios.saveAndFlush(luis);
        restauracion.restaurar(tercero.getId(),archivo);
        Long copia=servicio.historiales(tercero.getId()).getFirst().id();
        var estado=servicio.historial(tercero.getId(),copia);
        assertEquals("Luis",estado.pareja().nombre());
        assertNotEquals(luis.getId(),estado.pareja().id());
        var referencia=usuarios.findById(estado.pareja().id()).orElseThrow();
        assertTrue(referencia.isReferenciaHistorica());
        assertFalse(referencia.isActivo());
        assertThrows(PermisoCompartidoException.class, () -> servicio.historial(luis.getId(),copia));
    }
    @Test void invitarNoActivaNiComparteFinanzasSinAceptacion() {
        servicio.crear(ana.getId(),new ParejaCrearRequest(luis.getEmail()));
        assertNull(servicio.obtener(ana.getId()));
        assertNull(servicio.obtener(luis.getId()));
        assertThrows(IllegalArgumentException.class, () -> servicio.agregarGasto(ana.getId(),gasto("10.00")));
    }
    @Test void unMiembroNoPuedeBorrarElAporteDelOtro() {
        aceptada();
        var estado=servicio.agregarAporte(ana.getId(),new AportacionParejaRequest(new BigDecimal("100.00"),CalendarioFinanciero.hoy(),null));
        assertThrows(IllegalArgumentException.class, () -> servicio.eliminarAporte(luis.getId(),estado.aportes().getFirst().id()));
    }
    @Test void unMiembroNoPuedeBorrarElGastoDelOtro() {
        aceptada();
        var estado=servicio.agregarGasto(ana.getId(),gasto("10.00"));
        assertThrows(IllegalArgumentException.class, () -> servicio.eliminarGasto(luis.getId(),estado.gastos().getFirst().id()));
    }
    @Test void repartoNoPuedeDejarUnaParteEnCeroPorRedondeo() {
        aceptada();
        assertThrows(IllegalArgumentException.class, () -> servicio.agregarGasto(ana.getId(),gasto("0.01")));
    }
    @Test void restaurarNoReactivaNiImponeUnVinculoAOtraCuenta() {
        Pareja original=aceptada();
        servicio.agregarGasto(ana.getId(),gasto("10.00"));
        restauracion.restaurar(tercero.getId(),respaldos.generar(ana.getId()));
        assertNull(servicio.obtener(tercero.getId()));
        assertEquals(original.getId(),servicio.obtener(luis.getId()).id());
    }
    @Test void eliminarUnaCuentaNoBorraElGastoCompartidoDelOtroMiembro() {
        aceptada();
        Long gastoId=servicio.agregarGasto(ana.getId(),gasto("10.00")).gastos().getFirst().id();
        eliminarUsuario.eliminarCuenta(ana.getId(),new EliminarUsuarioRequest("password123"));
        assertTrue(usuarios.findById(ana.getId()).isEmpty());
        assertTrue(gastos.findById(gastoId).isPresent());
        assertNull(servicio.obtener(luis.getId()));
    }
    @Test void soloElDestinatarioAceptaYElReintentoNoDuplicaVinculos() {
        var invitacion=servicio.crear(ana.getId(),new ParejaCrearRequest(luis.getEmail()));
        assertThrows(PermisoCompartidoException.class, () -> servicio.aceptar(ana.getId(),invitacion.id()));
        assertThrows(PermisoCompartidoException.class, () -> servicio.aceptar(tercero.getId(),invitacion.id()));
        var activa=servicio.aceptar(luis.getId(),invitacion.id());
        assertTrue(activa.activa());
        assertEquals(invitacion.id(),servicio.aceptar(luis.getId(),invitacion.id()).id());
        assertEquals(1,parejas.contarActivasDeUsuario(ana.getId()));
        assertEquals(1,parejas.contarActivasDeUsuario(luis.getId()));
    }
    @Test void invitacionCanceladaNoPuedeAceptarse() {
        var invitacion=servicio.crear(ana.getId(),new ParejaCrearRequest(luis.getEmail()));
        servicio.resolverInvitacion(ana.getId(),invitacion.id());
        assertThrows(IllegalArgumentException.class, () -> servicio.aceptar(luis.getId(),invitacion.id()));
        assertTrue(servicio.invitaciones(luis.getId()).isEmpty());
    }
    @Test void invitacionRechazadaNoActivaLaParejaYUnTerceroNoPuedeResolverla() {
        var invitacion=servicio.crear(ana.getId(),new ParejaCrearRequest(luis.getEmail()));
        assertThrows(PermisoCompartidoException.class, () -> servicio.resolverInvitacion(tercero.getId(),invitacion.id()));
        servicio.resolverInvitacion(luis.getId(),invitacion.id());
        assertNull(servicio.obtener(ana.getId()));
        assertTrue(servicio.historiales(ana.getId()).isEmpty());
    }
    @Test void reintentarInvitarDevuelveLaMismaInvitacionPendiente() {
        var primera=servicio.crear(ana.getId(),new ParejaCrearRequest(luis.getEmail()));
        var segunda=servicio.crear(ana.getId(),new ParejaCrearRequest(luis.getEmail()));
        assertEquals(primera.id(),segunda.id());
        assertEquals(1,servicio.invitaciones(ana.getId()).size());
    }
    @Test void unaInvitacionViejaNoPuedeCrearUnaSegundaParejaActiva() {
        var primera=servicio.crear(ana.getId(),new ParejaCrearRequest(luis.getEmail()));
        var otra=servicio.crear(luis.getId(),new ParejaCrearRequest(tercero.getEmail()));
        servicio.aceptar(tercero.getId(),otra.id());
        assertThrows(IllegalArgumentException.class, () -> servicio.aceptar(luis.getId(),primera.id()));
        assertEquals(1,parejas.contarActivasDeUsuario(luis.getId()));
    }
    @Test void unPagoRecibidoSoloLoPuedeBorrarQuienLoRegistro() {
        aceptada();
        var estado=servicio.registrarPago(ana.getId(),new PagoParejaRequest(new BigDecimal("10.00"),
                CalendarioFinanciero.hoy(),luis.getId(),ana.getId(),null));
        var pago=estado.pagos().getFirst();
        assertEquals(ana.getId(),pago.registradoPorId());
        assertThrows(PermisoCompartidoException.class, () -> servicio.eliminarPago(luis.getId(),pago.id()));
        servicio.eliminarPago(ana.getId(),pago.id());
        assertTrue(servicio.obtener(ana.getId()).pagos().isEmpty());
    }
    @Test void desvincularConservaHistorialPeroBloqueaMovimientos() {
        var p=aceptada();
        servicio.agregarGasto(ana.getId(),gasto("10.00"));
        servicio.desvincular(luis.getId(),p.getId());
        assertFalse(servicio.historial(ana.getId(),p.getId()).activa());
        assertFalse(servicio.historial(luis.getId(),p.getId()).activa());
        assertThrows(PermisoCompartidoException.class, () -> servicio.historial(tercero.getId(),p.getId()));
        assertThrows(IllegalArgumentException.class, () -> servicio.agregarGasto(ana.getId(),gasto("10.00")));
    }
    @Test void laCopiaRestauradaEsInvisibleParaLaOtraPersonaYConservaAutorDePago() {
        aceptada();
        servicio.registrarPago(ana.getId(),new PagoParejaRequest(new BigDecimal("10.00"),
                CalendarioFinanciero.hoy(),luis.getId(),ana.getId(),null));
        restauracion.restaurar(tercero.getId(),respaldos.generar(ana.getId()));
        Long copia=servicio.historiales(tercero.getId()).getFirst().id();
        assertTrue(servicio.historiales(luis.getId()).isEmpty());
        assertThrows(PermisoCompartidoException.class, () -> servicio.historial(luis.getId(),copia));
        assertEquals(tercero.getId(),servicio.historial(tercero.getId(),copia).pagos().getFirst().registradoPorId());
    }
    @Test void alBorrarAmbasCuentasSeLimpianHistorialYReferenciasSinAcceso() {
        aceptada();
        servicio.agregarGasto(ana.getId(),gasto("10.00"));
        eliminarUsuario.eliminarCuenta(ana.getId(),new EliminarUsuarioRequest("password123"));
        assertEquals("Cuenta eliminada",servicio.historiales(luis.getId()).getFirst().nombrePareja());
        eliminarUsuario.eliminarCuenta(luis.getId(),new EliminarUsuarioRequest("password123"));
        assertEquals(0,parejas.count());
        assertEquals(0,gastos.count());
        assertTrue(usuarios.findAll().stream().noneMatch(Usuario::isReferenciaHistorica));
    }
    @Test void unPagoHistoricoSinAutorNoSePuedeBorrarNiPorElPagador() {
        var p=aceptada();
        var pago=pagos.save(PagoPareja.builder().pareja(p).pagador(ana).beneficiario(luis)
                .monto(new BigDecimal("10.00")).moneda("MXN").fecha(CalendarioFinanciero.hoy()).build());
        assertNull(servicio.obtener(ana.getId()).pagos().getFirst().registradoPorId());
        assertThrows(PermisoCompartidoException.class, () -> servicio.eliminarPago(ana.getId(),pago.getId()));
        assertThrows(PermisoCompartidoException.class, () -> servicio.eliminarPago(luis.getId(),pago.getId()));
        assertTrue(pagos.existsById(pago.getId()));
    }
}
