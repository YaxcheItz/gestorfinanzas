package com.gestionfinanzas.service;

import com.gestionfinanzas.controller.MetaController;
import com.gestionfinanzas.dto.request.*;
import com.gestionfinanzas.model.entity.*;
import com.gestionfinanzas.model.enums.*;
import com.gestionfinanzas.repository.*;
import com.gestionfinanzas.security.CustomUserDetails;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest @ActiveProfiles("test") @Transactional
class MetasDivisasIntegrationTest {
    @Autowired MetaController metas; @Autowired CuentaService servicioCuentas;
    @Autowired CuentaRepository cuentas; @Autowired UsuarioRepository usuarios;
    @Autowired TransaccionService movimientos; @Autowired RespaldoFinancieroService respaldo;
    @Autowired RestauracionRespaldoService restauracion;
    Usuario a,b; Cuenta banco;
    @BeforeEach void preparar(){
        a=usuario(); b=usuario(); banco=cuentas.save(Cuenta.builder().usuario(a).nombre("Banco").tipo(TipoCuenta.DEBITO).moneda("MXN").saldoActual(new BigDecimal("1000.00")).build());
    }
    Usuario usuario(){return usuarios.save(Usuario.builder().nombre("QA Meta").email(UUID.randomUUID()+"@example.test").passwordHash("hash").build());}
    TransaccionRequest transferencia(Long origen,Long destino,String monto,BigDecimal tasa){return new TransaccionRequest(origen,destino,null,TipoTransaccion.TRANSFERENCIA,new BigDecimal(monto),tasa,LocalDate.of(2026,10,21),"Transferencia propia",null,null,null,null);}
    Long meta(){return metas.crear(new CustomUserDetails(a),new MetaController.Crear("Viaje",new BigDecimal("500.00"),"MXN")).data().id();}

    @Test void aporteYRetiroConservanFondosYReintentarNoDuplica(){
        var id=meta();var clave=UUID.randomUUID();var aporte=transferencia(banco.getId(),id,"30.00",null);
        var primero=movimientos.crearTransaccion(a.getId(),aporte,clave);
        assertEquals(primero.id(),movimientos.crearTransaccion(a.getId(),aporte,clave).id());
        movimientos.crearTransaccion(a.getId(),transferencia(id,banco.getId(),"10.00",null));
        assertEquals(new BigDecimal("20.00"),cuentas.findById(id).orElseThrow().getSaldoActual());
        assertEquals(new BigDecimal("980.00"),banco.getSaldoActual());
        assertEquals(TipoTransaccion.TRANSFERENCIA,primero.tipo());
    }
    @Test void cancelarConservaFondosYUnTerceroNoAdministraNiUsaLaCuenta(){
        var id=meta();movimientos.crearTransaccion(a.getId(),transferencia(banco.getId(),id,"30.00",null));
        assertThrows(IllegalArgumentException.class,()->metas.estado(new CustomUserDetails(b),id,new MetaController.Estado(true)));
        assertThrows(IllegalArgumentException.class,()->movimientos.crearTransaccion(b.getId(),transferencia(id,banco.getId(),"10.00",null)));
        var cancelada=metas.estado(new CustomUserDetails(a),id,new MetaController.Estado(true)).data();
        assertTrue(cancelada.metaCancelada());assertEquals(new BigDecimal("30.00"),cancelada.saldoActual());
        movimientos.crearTransaccion(a.getId(),transferencia(id,banco.getId(),"30.00",null));
        assertEquals(new BigDecimal("1000.00"),banco.getSaldoActual());
    }
    @Test void respaldoConservaMetaCanceladaYSaldoSinVincularAlPropietarioAnterior(){
        var id=meta();movimientos.crearTransaccion(a.getId(),transferencia(banco.getId(),id,"30.00",null));
        metas.estado(new CustomUserDetails(a),id,new MetaController.Estado(true));
        restauracion.restaurar(b.getId(),respaldo.generar(a.getId()));
        var copia=cuentas.findByUsuarioIdAndActivoTrue(b.getId()).stream().filter(c->c.getMetaObjetivo()!=null).findFirst().orElseThrow();
        assertEquals(new BigDecimal("500.00"),copia.getMetaObjetivo());assertTrue(copia.isMetaCancelada());
        assertEquals(new BigDecimal("30.00"),copia.getSaldoActual());assertNotEquals(id,copia.getId());
    }
    @Test void divisasConservanImportesFuenteYFechaAunqueCambiePreferenciaYAlRestaurar(){
        var usd=cuentas.save(Cuenta.builder().usuario(a).nombre("USD").tipo(TipoCuenta.AHORRO).moneda("USD").build());
        var t=movimientos.crearTransaccion(a.getId(),transferencia(banco.getId(),usd.getId(),"100.00",new BigDecimal("0.05")));
        assertEquals(new BigDecimal("5.00"),t.montoDestino());assertEquals("MANUAL",t.fuenteCambio());assertEquals(t.fecha(),t.fechaCambio());
        a.setMonedaPreferida("USD");usuarios.save(a);
        var historica=movimientos.obtenerPorId(a.getId(),t.id());assertEquals("MXN",historica.moneda());assertEquals(t.montoDestino(),historica.montoDestino());
        var csv=movimientos.exportarCsv(a.getId(),new TransaccionFiltroRequest(null,null,null,null,null,null,null,null,null,null,null,null,null));
        assertTrue(csv.contains("Fuente de cambio"));assertTrue(csv.contains("MANUAL"));
        var archivo=respaldo.generar(a.getId());restauracion.restaurar(b.getId(),archivo);
        var copia=respaldo.generar(b.getId()).transacciones().stream().filter(x->x.fuenteCambio()!=null).findFirst().orElseThrow();
        assertEquals(t.fechaCambio(),copia.fechaCambio());assertEquals("MANUAL",copia.fuenteCambio());assertEquals(t.montoDestino(),copia.montoDestino());
    }
    @Test void monedaDeMetaEsInmutableInclusoSinSaldo(){
        var id=meta();
        assertThrows(IllegalArgumentException.class,()->servicioCuentas.actualizarCuenta(a.getId(),id,new CuentaRequest("Viaje",TipoCuenta.AHORRO,null,null,null,null,null,null,null,"USD",null)));
    }
}
