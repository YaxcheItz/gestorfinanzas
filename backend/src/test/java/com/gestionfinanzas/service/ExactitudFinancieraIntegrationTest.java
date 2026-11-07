package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.TransaccionRequest;
import com.gestionfinanzas.model.entity.*;
import com.gestionfinanzas.model.enums.*;
import com.gestionfinanzas.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ExactitudFinancieraIntegrationTest {
    @Autowired TransaccionService movimientos;
    @Autowired DashboardService dashboard;
    @Autowired LibroDiarioService libro;
    @Autowired UsuarioService usuarioService;
    @Autowired org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @Autowired PlantillaRecurrenteService recurrentes;
    @Autowired UsuarioRepository usuarios;
    @Autowired CuentaRepository cuentas;
    @Autowired PlantillaRecurrenteRepository plantillas;
    @Autowired TransaccionRepository transacciones;
    @Autowired RespaldoFinancieroService respaldos;
    @Autowired RestauracionRespaldoService restauracion;
    @Autowired EntityManager em;
    Long usuarioId;
    Long cuentaId;

    @BeforeEach void preparar() {
        Usuario usuario = usuarios.save(Usuario.builder().nombre("Exactitud")
                .email(UUID.randomUUID()+"@example.com").passwordHash("prueba")
                .rol(RolUsuario.ROLE_USER).activo(true).build());
        usuarioId = usuario.getId();
        cuentaId = cuentas.save(Cuenta.builder().usuario(usuario).nombre("Tarjeta")
                .tipo(TipoCuenta.CREDITO).diaCorte(30).limiteCredito(new BigDecimal("1000.00")).build()).getId();
    }
    TransaccionRequest compra(String monto, int cuotas) {
        return new TransaccionRequest(cuentaId, null, null, TipoTransaccion.GASTO,
                new BigDecimal(monto), null, LocalDate.of(2025,1,30), "Compra", null, null, null, cuotas);
    }
    PlantillaRecurrente plan() {
        return plantillas.findAllByUsuarioIdOrderBySiguienteFechaAsc(usuarioId).getFirst();
    }
    void comprobarCuenta(String saldo, String retenido) {
        em.flush(); em.clear();
        Cuenta cuenta = cuentas.findById(cuentaId).orElseThrow();
        assertEquals(new BigDecimal(saldo), cuenta.getSaldoActual());
        assertEquals(new BigDecimal(retenido), cuenta.getLimiteRetenido());
    }
    @Test void compraMsiFuturaRetieneTotalSinAfectarSaldoAntesDelCorte() {
        var fecha = CalendarioFinanciero.hoy().plusMonths(1).withDayOfMonth(1);
        movimientos.crearTransaccion(usuarioId, new TransaccionRequest(cuentaId,null,null,
                TipoTransaccion.GASTO,new BigDecimal("90.00"),null,fecha,"Compra ficticia",null,null,null,3));
        libro.ejecutarBackfill(usuarioId);
        assertTrue(libro.listarParaRespaldo(usuarioId).isEmpty());
        comprobarCuenta("0.00","90.00");
    }
    @Test void cuotaPendienteSoloSeAplicaAlCorteYUnaSolaVez() {
        var fecha=CalendarioFinanciero.hoy().plusMonths(1).withDayOfMonth(1);
        var t=movimientos.crearTransaccion(usuarioId,new TransaccionRequest(cuentaId,null,null,
                TipoTransaccion.GASTO,new BigDecimal("90.00"),null,fecha,"Compra ficticia",null,null,null,3));
        movimientos.aplicarCuotaAlCorte(usuarioId,t.id(),t.fecha().minusDays(1));
        comprobarCuenta("0.00","90.00");
        movimientos.aplicarCuotaAlCorte(usuarioId,t.id(),t.fecha());
        movimientos.aplicarCuotaAlCorte(usuarioId,t.id(),t.fecha());
        comprobarCuenta("-30.00","60.00");
    }
    @Test void editarYBorrarAntesDelCorteNoCreaDeudaNiDevolucion() {
        var fecha=CalendarioFinanciero.hoy().plusMonths(1).withDayOfMonth(1);
        var t=movimientos.crearTransaccion(usuarioId,new TransaccionRequest(cuentaId,null,null,TipoTransaccion.GASTO,new BigDecimal("90.00"),null,fecha,"Ficticia",null,null,null,3));
        movimientos.actualizarTransaccion(usuarioId,t.id(),new TransaccionRequest(cuentaId,null,null,TipoTransaccion.GASTO,new BigDecimal("120.00"),null,fecha,"Ficticia",null,null,null,4));
        comprobarCuenta("0.00","120.00");
        movimientos.eliminarTransaccion(usuarioId,t.id(),true);
        comprobarCuenta("0.00","0.00");
    }
    @Test void respaldoConservaCuotaPendienteSinAnticiparCargo() {
        var fecha=CalendarioFinanciero.hoy().plusMonths(1).withDayOfMonth(1);
        movimientos.crearTransaccion(usuarioId,new TransaccionRequest(cuentaId,null,null,TipoTransaccion.GASTO,new BigDecimal("90.00"),null,fecha,"Ficticia",null,null,null,3));
        var respaldo=respaldos.generar(usuarioId);
        var destino=usuarios.save(Usuario.builder().nombre("Restaurado ficticio").email(UUID.randomUUID()+"@example.test").passwordHash("prueba").rol(RolUsuario.ROLE_USER).activo(true).build());
        restauracion.restaurar(destino.getId(),respaldo);
        var cuota=transacciones.findAllByUsuarioIdOrderByFechaAscIdAsc(destino.getId()).stream().filter(t -> !t.isCompraMsiInformativa()).findFirst().orElseThrow();
        assertTrue(cuota.isImpactoPendiente());
        assertEquals(0,cuota.getCuenta().getSaldoActual().compareTo(BigDecimal.ZERO));
        assertEquals(new BigDecimal("90.00"),cuota.getCuenta().getLimiteRetenido());
    }
    @Test void inicioNoMuestraLaPrimeraCuotaAntesDelCorte() {
        var hoy=CalendarioFinanciero.hoy();
        var fecha=hoy.plusMonths(1).withDayOfMonth(1);
        var t=movimientos.crearTransaccion(usuarioId,new TransaccionRequest(cuentaId,null,null,TipoTransaccion.GASTO,new BigDecimal("90.00"),null,fecha,"Ficticia",null,null,null,3));
        var resumen=dashboard.obtenerResumen(usuarioId,fecha.getMonthValue(),fecha.getYear());
        assertTrue(resumen.ultimosMovimientos().stream().noneMatch(x->x.id().equals(t.id())));
        comprobarCuenta("0.00","90.00");
    }
    @Test void compraTotalPersisteYLaCuotaSoloCuentaAlCorte() {
        var fecha=CalendarioFinanciero.hoy().plusMonths(1).withDayOfMonth(1);
        var t=movimientos.crearTransaccion(usuarioId,new TransaccionRequest(cuentaId,null,null,TipoTransaccion.GASTO,new BigDecimal("90.00"),null,fecha,"Compra ficticia total",null,null,null,3));
        var compra=transacciones.bloquearCompraMsi(usuarioId,t.compraMsiId()).stream().filter(Transaccion::isCompraMsiInformativa).findFirst().orElseThrow();
        assertEquals(new BigDecimal("90.00"),compra.getMonto());assertEquals(fecha,compra.getFecha());
        assertTrue(dashboard.obtenerResumen(usuarioId,fecha.getMonthValue(),fecha.getYear()).ultimosMovimientos().stream().anyMatch(x->x.compraMsiInformativa() && x.monto().compareTo(new BigDecimal("90"))==0));
        comprobarCuenta("0.00","90.00");
        movimientos.aplicarCuotaAlCorte(usuarioId,t.id(),t.fecha());
        comprobarCuenta("-30.00","60.00");
        assertTrue(transacciones.findById(compra.getId()).isPresent());
        assertEquals(0,new BigDecimal("30.00").compareTo(transacciones.sumMontoPorUsuarioYTipoYPeriodo(usuarioId,TipoTransaccion.GASTO,fecha.withDayOfMonth(1),fecha.plusMonths(2))));
        movimientos.eliminarTransaccion(usuarioId,t.id(),true);
        assertTrue(transacciones.bloquearCompraMsi(usuarioId,t.compraMsiId()).isEmpty());
        comprobarCuenta("0.00","0.00");
    }
    @Test void compraAntesDelCorteRegistraPrimeraCuotaEnCorteYConservaRetencion() {
        var primera = movimientos.crearTransaccion(usuarioId, new TransaccionRequest(cuentaId,null,null,
                TipoTransaccion.GASTO,new BigDecimal("100.00"),null,LocalDate.of(2025,1,10),
                "Compra ficticia",null,null,null,3));
        assertEquals(LocalDate.of(2025,1,30), primera.fecha());
        assertEquals(LocalDate.of(2025,2,28), plan().getSiguienteFecha());
        comprobarCuenta("-33.33","66.67");
    }
    @Test void compraDespuesDelCortePasaAlSiguienteMes() {
        var primera = movimientos.crearTransaccion(usuarioId, new TransaccionRequest(cuentaId,null,null,
                TipoTransaccion.GASTO,new BigDecimal("100.00"),null,LocalDate.of(2025,1,31),
                "Compra ficticia",null,null,null,3));
        assertEquals(LocalDate.of(2025,2,28), primera.fecha());
        assertEquals(LocalDate.of(2025,3,30), plan().getSiguienteFecha());
    }
    @Test void sinCorteNoSeCreaPlanNiSeRetieneCredito() {
        cuentas.findById(cuentaId).orElseThrow().setDiaCorte(null);
        assertThrows(IllegalArgumentException.class, () -> movimientos.crearTransaccion(usuarioId,compra("100.00",3)));
        assertEquals(0,planCount()); comprobarCuenta("0.00","0.00");
    }
    @Test void cambiarCorteDeTarjetaNoReprogramaPlanExistente() {
        movimientos.crearTransaccion(usuarioId,compra("100.00",3));
        cuentas.findById(cuentaId).orElseThrow().setDiaCorte(15);
        recurrentes.registrarSiguiente(usuarioId,plan().getId());
        assertEquals(LocalDate.of(2025,3,30),plan().getSiguienteFecha());
    }
    @Test void tresCuotasSumanTotalExactoYNoDejanRetencion() {
        var inicial = movimientos.crearTransaccion(usuarioId, compra("100.00",3));
        Long id = plan().getId();
        comprobarCuenta("-33.33","66.67");
        assertEquals(LocalDate.of(2025,1,30), plan().getFechaAncla());
        assertEquals(LocalDate.of(2025,2,28), plan().getSiguienteFecha());
        recurrentes.registrarSiguiente(usuarioId,id);
        comprobarCuenta("-66.66","33.34");
        assertEquals(LocalDate.of(2025,1,30), plan().getFechaAncla());
        assertEquals(LocalDate.of(2025,3,30), plan().getSiguienteFecha());
        recurrentes.registrarSiguiente(usuarioId,id);
        comprobarCuenta("-100.00","0.00");
        assertFalse(plan().isActiva());
        assertEquals(3, transacciones.findAll().stream()
                .filter(t -> inicial.compraMsiId().equals(t.getCompraMsiId()) && !t.isCompraMsiInformativa()).count());
        assertThrows(IllegalArgumentException.class, () -> recurrentes.cambiarEstado(usuarioId,id,true));
    }
    @Test void cancelarLiberaSoloPendienteYConservaPagos() {
        var inicial = movimientos.crearTransaccion(usuarioId, compra("100.00",3));
        Long id = plan().getId();
        recurrentes.registrarSiguiente(usuarioId,id);
        recurrentes.eliminar(usuarioId,id);
        comprobarCuenta("-66.66","0.00");
        assertTrue(transacciones.findById(inicial.id()).isPresent());
    }
    @Test void noEliminaPlanSinConfirmacionExplicita() {
        var inicial=movimientos.crearTransaccion(usuarioId,compra("100.00",3));
        assertThrows(IllegalArgumentException.class,()->movimientos.eliminarTransaccion(usuarioId,inicial.id()));
        comprobarCuenta("-33.33","66.67");assertEquals(1,planCount());
    }
    @Test
    @org.springframework.transaction.annotation.Transactional(propagation=org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void errorDeCreditoRevierteTodasLasCuotasYLaRetencion() {
        var usuario=usuarios.findById(usuarioId).orElseThrow();
        usuario.setPasswordHash(passwordEncoder.encode("Password123"));usuarios.saveAndFlush(usuario);
        try {
        var inicial=movimientos.crearTransaccion(usuarioId,compra("100.00",3));
        assertThrows(IllegalArgumentException.class,()->movimientos.actualizarTransaccion(usuarioId,inicial.id(),compra("2000.00",3)));
        var cuenta = cuentas.findById(cuentaId).orElseThrow();
        assertEquals(new BigDecimal("-33.33"),cuenta.getSaldoActual());
        assertEquals(new BigDecimal("66.67"),cuenta.getLimiteRetenido());
        assertEquals(new BigDecimal("100.00"),movimientos.datosPlanMsi(usuarioId,inicial.id()).monto());
        movimientos.eliminarTransaccion(usuarioId,inicial.id(),true);
        } finally {
            usuarioService.eliminarCuenta(usuarioId,new com.gestionfinanzas.dto.request.EliminarUsuarioRequest("Password123"));
        }
    }
    @Test void otroUsuarioNoEditaNiEliminaPlanCompleto() {
        var inicial=movimientos.crearTransaccion(usuarioId,compra("100.00",3));
        assertThrows(IllegalArgumentException.class,()->movimientos.actualizarTransaccion(-1L,inicial.id(),compra("200.00",3)));
        assertThrows(IllegalArgumentException.class,()->movimientos.eliminarTransaccion(-1L,inicial.id(),true));
        comprobarCuenta("-33.33","66.67");
    }
    @Test void editarPlanActualizaTodasLasCuotasYRetencion() {
        var inicial=movimientos.crearTransaccion(usuarioId,compra("100.00",3));
        recurrentes.registrarSiguiente(usuarioId,plan().getId());
        movimientos.actualizarTransaccion(usuarioId,inicial.id(),compra("200.00",4));
        comprobarCuenta("-100.00","100.00");
        assertEquals(3,plan().getCuotasTotales());assertEquals(1,plan().getCuotasPagadas());
        assertEquals(new BigDecimal("200.00"),movimientos.datosPlanMsi(usuarioId,inicial.id()).monto());
        recurrentes.registrarSiguiente(usuarioId,plan().getId());
        recurrentes.registrarSiguiente(usuarioId,plan().getId());
        comprobarCuenta("-200.00","0.00");
    }
    @Test void editarYEliminarPlanRecalculaCashbackSinDejarSaldoResidual() {
        cuentas.findById(cuentaId).orElseThrow().setCashbackPorcentaje(new BigDecimal("5.00"));
        var inicial=movimientos.crearTransaccion(usuarioId,compra("100.00",3));
        movimientos.actualizarTransaccion(usuarioId,inicial.id(),compra("200.00",4));
        comprobarCuenta("-47.50","150.00");
        movimientos.eliminarTransaccion(usuarioId,inicial.id(),true);
        comprobarCuenta("0.00","0.00");
    }
    @Test void respaldoDePlanEditadoConservaCuotasYRetencion() {
        var inicial=movimientos.crearTransaccion(usuarioId,compra("100.00",3));
        recurrentes.registrarSiguiente(usuarioId,plan().getId());
        movimientos.actualizarTransaccion(usuarioId,inicial.id(),compra("200.00",4));
        var respaldo=respaldos.generar(usuarioId);
        var destino=usuarios.save(Usuario.builder().nombre("Restaurado ficticio").email(UUID.randomUUID()+"@example.test").passwordHash("prueba").rol(RolUsuario.ROLE_USER).activo(true).build());
        restauracion.restaurar(destino.getId(),respaldo);
        var nuevo=plantillas.findAllByUsuarioIdOrderBySiguienteFechaAsc(destino.getId()).getFirst();
        assertEquals(new BigDecimal("100.00"),nuevo.getMontoPendiente());
        assertEquals(3,nuevo.getCuotasTotales());assertEquals(1,nuevo.getCuotasPagadas());
        assertEquals(new BigDecimal("100.00"),nuevo.getCuenta().getLimiteRetenido());
    }
    @Test void eliminarPlanRevierteCuotasYLiberaRetencion() {
        var inicial=movimientos.crearTransaccion(usuarioId,compra("100.00",3));
        recurrentes.registrarSiguiente(usuarioId,plan().getId());
        movimientos.eliminarTransaccion(usuarioId,inicial.id(),true);
        comprobarCuenta("0.00","0.00");assertEquals(0,planCount());
        assertTrue(transacciones.findById(inicial.id()).isEmpty());
    }
    @Test void eliminarPlanCanceladoRevierteSoloLasCuotasRegistradas() {
        var inicial=movimientos.crearTransaccion(usuarioId,compra("100.00",3));
        recurrentes.eliminar(usuarioId,plan().getId());
        movimientos.eliminarTransaccion(usuarioId,inicial.id(),true);
        comprobarCuenta("0.00","0.00");
    }
    @Test void cuotasMenoresAUnCentavoSeRechazanSinEfecto() {
        assertThrows(IllegalArgumentException.class, () -> movimientos.crearTransaccion(usuarioId,compra("0.01",3)));
        assertEquals(0, planCount());
        comprobarCuenta("0.00","0.00");
    }
    int planCount() { return plantillas.findAllByUsuarioIdOrderBySiguienteFechaAsc(usuarioId).size(); }
    @Test void respaldoMantienePendienteAnclaYVinculo() {
        movimientos.crearTransaccion(usuarioId, compra("100.00",3));
        recurrentes.registrarSiguiente(usuarioId,plan().getId());
        var respaldo = respaldos.generar(usuarioId);
        Usuario destino = usuarios.save(Usuario.builder().nombre("Restaurado")
                .email(UUID.randomUUID()+"@example.com").passwordHash("prueba")
                .rol(RolUsuario.ROLE_USER).activo(true).build());
        restauracion.restaurar(destino.getId(),respaldo);
        var planRestaurado = plantillas.findAllByUsuarioIdOrderBySiguienteFechaAsc(destino.getId()).getFirst();
        assertEquals(new BigDecimal("33.34"),planRestaurado.getMontoPendiente());
        assertEquals(LocalDate.of(2025,1,30),planRestaurado.getFechaAncla());
        assertEquals(1,planRestaurado.getCuotasPagadas());
        recurrentes.registrarSiguiente(destino.getId(),planRestaurado.getId());
        em.flush(); em.clear();
        assertEquals(new BigDecimal("0.00"),cuentas.findById(planRestaurado.getCuenta().getId()).orElseThrow().getLimiteRetenido());
    }
    @Test void calendarioRecuperaDiaTreintaDespuesDeFebrero() {
        LocalDate ancla = LocalDate.of(2025,1,30);
        LocalDate febrero = CalendarioFinanciero.siguiente(ancla,FrecuenciaRecurrencia.MENSUAL,ancla);
        assertEquals(LocalDate.of(2025,2,28),febrero);
        assertEquals(LocalDate.of(2025,3,30),CalendarioFinanciero.siguiente(febrero,FrecuenciaRecurrencia.MENSUAL,ancla));
    }
    @Test void calendarioConservaFinDeMesYAniversarioBisiesto() {
        LocalDate ancla = LocalDate.of(2025,1,31);
        assertEquals(LocalDate.of(2025,3,31),CalendarioFinanciero.siguiente(LocalDate.of(2025,2,28),FrecuenciaRecurrencia.MENSUAL,ancla));
        assertEquals(LocalDate.of(2028,2,29),CalendarioFinanciero.siguiente(LocalDate.of(2027,2,28),FrecuenciaRecurrencia.ANUAL,LocalDate.of(2024,2,29)));
    }
    @Test void fechaCivilNoDependeDeZonaDelServidor() {
        Clock utc = Clock.fixed(Instant.parse("2026-10-07T02:00:00Z"),ZoneOffset.UTC);
        assertEquals(LocalDate.of(2026,10,6),CalendarioFinanciero.hoy(utc));
    }
    @Test void corteTreintaRecuperaDiaTrasFebrero() {
        movimientos.crearTransaccion(usuarioId, new TransaccionRequest(cuentaId,null,null,
                TipoTransaccion.GASTO,new BigDecimal("100.00"),null,LocalDate.of(2025,2,28),
                "Compra",null,null,null,3));
        assertEquals(LocalDate.of(2025,3,30),plan().getSiguienteFecha());
    }
    @Test void pausaConservaRetencionYNoPermiteRegistrar() {
        movimientos.crearTransaccion(usuarioId,compra("100.00",3));
        Long id = plan().getId();
        recurrentes.cambiarEstado(usuarioId,id,false);
        assertThrows(IllegalArgumentException.class, () -> recurrentes.registrarSiguiente(usuarioId,id));
        comprobarCuenta("-33.33","66.67");
    }
    @Test void otroUsuarioNoPuedeCancelarNiRegistrarElPlan() {
        movimientos.crearTransaccion(usuarioId,compra("100.00",3));
        Long id = plan().getId();
        assertThrows(IllegalArgumentException.class, () -> recurrentes.eliminar(-1L,id));
        assertThrows(IllegalArgumentException.class, () -> recurrentes.registrarSiguiente(-1L,id));
        comprobarCuenta("-33.33","66.67");
    }
    @Test void cuotaFuturaNoSeRegistra() {
        movimientos.crearTransaccion(usuarioId, new TransaccionRequest(cuentaId,null,null,
                TipoTransaccion.GASTO,new BigDecimal("100.00"),null,CalendarioFinanciero.hoy().plusYears(1),
                "Compra",null,null,null,3));
        Long id = plan().getId();
        assertThrows(IllegalArgumentException.class, () -> recurrentes.registrarSiguiente(usuarioId,id));
        comprobarCuenta("0.00","100.00");
    }
    @Test void variasComprasSeCancelanSinLiberarCreditoAjeno() {
        movimientos.crearTransaccion(usuarioId,compra("100.00",3));
        Long primero = plan().getId();
        movimientos.crearTransaccion(usuarioId,compra("200.00",3));
        recurrentes.eliminar(usuarioId,primero);
        comprobarCuenta("-99.99","133.34");
    }
    @Test void servicioRechazaMontoConFraccionesDeCentavo() {
        assertThrows(IllegalArgumentException.class, () -> movimientos.crearTransaccion(usuarioId,compra("100.001",3)));
        comprobarCuenta("0.00","0.00");
    }
    @Test void recurrenciaNormalConservaElDiaOriginalCuandoFebreroLoAcorta() {
        movimientos.crearTransaccion(usuarioId, new TransaccionRequest(cuentaId,null,null,
                TipoTransaccion.GASTO,new BigDecimal("10.00"),null,LocalDate.of(2025,1,30),
                "Gasto",null,FrecuenciaRecurrencia.MENSUAL,LocalDate.of(2025,2,28),null));
        Long id = plan().getId();
        recurrentes.registrarSiguiente(usuarioId,id);
        assertEquals(LocalDate.of(2025,3,30),plan().getSiguienteFecha());
    }
    @Test void fechaRecurrentePersonalizadaDefineSuPropiaAncla() {
        movimientos.crearTransaccion(usuarioId, new TransaccionRequest(cuentaId,null,null,
                TipoTransaccion.GASTO,new BigDecimal("10.00"),null,LocalDate.of(2025,1,30),
                "Gasto",null,FrecuenciaRecurrencia.MENSUAL,LocalDate.of(2025,2,15),null));
        Long id = plan().getId();
        recurrentes.registrarSiguiente(usuarioId,id);
        assertEquals(LocalDate.of(2025,3,15),plan().getSiguienteFecha());
    }
}
