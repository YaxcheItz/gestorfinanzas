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
                .tipo(TipoCuenta.CREDITO).limiteCredito(new BigDecimal("1000.00")).build()).getId();
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
                .filter(t -> inicial.compraMsiId().equals(t.getCompraMsiId())).count());
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
    @Test void cuotasNoSePuedenAlterarIndividualmente() {
        var inicial = movimientos.crearTransaccion(usuarioId, compra("100.00",3));
        assertThrows(IllegalArgumentException.class, () -> movimientos.actualizarTransaccion(usuarioId,inicial.id(),compra("50.00",3)));
        assertThrows(IllegalArgumentException.class, () -> movimientos.eliminarTransaccion(usuarioId,inicial.id()));
        comprobarCuenta("-33.33","66.67");
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
    @Test void primeraFechaMsiDeFinDeFebreroEsFinDeMarzo() {
        movimientos.crearTransaccion(usuarioId, new TransaccionRequest(cuentaId,null,null,
                TipoTransaccion.GASTO,new BigDecimal("100.00"),null,LocalDate.of(2025,2,28),
                "Compra",null,null,null,3));
        assertEquals(LocalDate.of(2025,3,31),plan().getSiguienteFecha());
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
        comprobarCuenta("-33.33","66.67");
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
