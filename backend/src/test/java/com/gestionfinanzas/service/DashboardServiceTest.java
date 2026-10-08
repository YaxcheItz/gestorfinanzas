package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.response.DashboardGastoCategoriaResponse;
import com.gestionfinanzas.dto.response.DashboardMesTipoTotal;
import com.gestionfinanzas.dto.response.DashboardMonedaTotales;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DashboardServiceTest {

    @Test
    void rangoPersonalizadoAplicaALosTotalesCategoriasYActividad() {
        LocalDate desde = LocalDate.of(2025, 12, 29);
        LocalDate hasta = LocalDate.of(2026, 1, 4);
        dashboardService.obtenerResumen(7L, 1, 2026, desde, hasta);
        dashboardService.obtenerAnalitica(7L, 1, 2026, desde, hasta);
        verify(transaccionRepository).findTotalesMensualesPorMoneda(7L, desde, hasta);
        verify(transaccionRepository).findTop10ByUsuarioIdAndFechaBetweenOrderByFechaDescIdDesc(7L, desde, hasta);
        verify(transaccionRepository).findGastosPorCategoria(7L, TipoTransaccion.GASTO, desde, hasta);
    }

    @Test
    void rechazaRangosIncompletosOInvertidos() {
        LocalDate desde = LocalDate.of(2026, 1, 4);
        LocalDate hasta = LocalDate.of(2025, 12, 29);
        assertThrows(IllegalArgumentException.class, () -> dashboardService.obtenerResumen(7L, 1, 2026, desde, hasta));
        assertThrows(IllegalArgumentException.class, () -> dashboardService.obtenerAnalitica(7L, 1, 2026, desde, null));
    }

    private final CuentaRepository cuentaRepository = mock(CuentaRepository.class);
    private final TransaccionRepository transaccionRepository = mock(TransaccionRepository.class);
    private final DashboardService dashboardService = new DashboardService(cuentaRepository, transaccionRepository);

    @Test
    void balanceTotalSumaSaldosActivosDeDebitoAhorroInversionYDeudaDeCreditoPorMoneda() {
        Cuenta debito = cuenta(1L, TipoCuenta.DEBITO, "MXN", "1000.00");
        Cuenta ahorro = cuenta(2L, TipoCuenta.AHORRO, "MXN", "2500.00");
        Cuenta inversion = cuenta(3L, TipoCuenta.INVERSION, "MXN", "3000.00");
        Cuenta tarjeta = cuenta(4L, TipoCuenta.CREDITO, "MXN", "-750.00");
        when(cuentaRepository.findByUsuarioIdAndActivoTrue(7L))
                .thenReturn(List.of(debito, ahorro, inversion, tarjeta));
        when(transaccionRepository.findTotalesMensualesPorMoneda(
                eq(7L), any(LocalDate.class), any(LocalDate.class)
        )).thenReturn(List.of(
                new DashboardMonedaTotales("MXN", BigDecimal.ZERO, BigDecimal.ZERO)
        ));
        when(transaccionRepository.findTop10ByUsuarioIdOrderByFechaDescIdDesc(7L)).thenReturn(List.of());

        var resumen = dashboardService.obtenerResumen(7L, null, null);

        assertEquals(new BigDecimal("5750.00"), resumen.balanceTotal());
        assertEquals(4, resumen.totalCuentas());
        assertEquals(new BigDecimal("5750.00"), resumen.resumenPorMoneda().get(0).balanceTotal());
        assertEquals(4, resumen.resumenPorMoneda().get(0).totalCuentas());
    }

    @Test
    void obtenerAnaliticaRetornaSeisMesesEnOrdenIncluyendoMesesSinMovimientos() {
        long usuarioId = 7L;
        YearMonth mesActual = YearMonth.now();
        YearMonth mesAnterior = mesActual.minusMonths(1);
        List<DashboardGastoCategoriaResponse> gastos = List.of(
                new DashboardGastoCategoriaResponse(2L, "Comida", "#10b981", new BigDecimal("250.00"), "MXN")
        );
        when(transaccionRepository.findGastosPorCategoria(
                usuarioId, TipoTransaccion.GASTO, mesActual.atDay(1), mesActual.atEndOfMonth()
        )).thenReturn(gastos);
        when(transaccionRepository.sumMontosPorUsuarioYTipoAgrupadosPorMes(
                usuarioId,
                List.of(TipoTransaccion.INGRESO, TipoTransaccion.GASTO),
                mesActual.minusMonths(5).atDay(1),
                mesActual.atEndOfMonth()
        )).thenReturn(List.of(
                new DashboardMesTipoTotal(mesAnterior.getYear(), mesAnterior.getMonthValue(),
                        TipoTransaccion.GASTO, new BigDecimal("80.00"), "MXN"),
                new DashboardMesTipoTotal(mesActual.getYear(), mesActual.getMonthValue(),
                        TipoTransaccion.INGRESO, new BigDecimal("1000.00"), "MXN")
        ));
        when(transaccionRepository.findTotalesMensualesPorMoneda(
                usuarioId, mesActual.minusMonths(5).atDay(1), mesActual.atEndOfMonth()
        )).thenReturn(List.of(
                new DashboardMonedaTotales("MXN", new BigDecimal("1000.00"), new BigDecimal("80.00"))
        ));

        var resultado = dashboardService.obtenerAnalitica(usuarioId);

        assertEquals(gastos, resultado.gastosPorCategoria());
        assertEquals(6, resultado.ultimosSeisMeses().size());
        assertEquals(mesActual.minusMonths(5).getMonthValue(), resultado.ultimosSeisMeses().get(0).mes());

        var datosMesAnterior = resultado.ultimosSeisMeses().get(4);
        assertEquals(mesAnterior.getMonthValue(), datosMesAnterior.mes());
        assertEquals(BigDecimal.ZERO, datosMesAnterior.ingresos());
        assertEquals(new BigDecimal("80.00"), datosMesAnterior.gastos());

        var datosMesActual = resultado.ultimosSeisMeses().get(5);
        assertEquals(new BigDecimal("1000.00"), datosMesActual.ingresos());
        assertEquals(BigDecimal.ZERO, datosMesActual.gastos());
        assertEquals("MXN", datosMesActual.moneda());
        verify(transaccionRepository).findGastosPorCategoria(
                usuarioId, TipoTransaccion.GASTO, mesActual.atDay(1), mesActual.atEndOfMonth()
        );
    }

    @Test
    void comparaMesConAnteriorSinMezclarMonedasNiDividirEntreCero() {
        when(transaccionRepository.findTotalesMensualesPorMoneda(
                7L, LocalDate.of(2025, 1, 1), LocalDate.of(2025, 1, 31)
        )).thenReturn(List.of(new DashboardMonedaTotales(
                "MXN", new BigDecimal("1000.00"), new BigDecimal("600.00")
        )));
        when(transaccionRepository.findTotalesMensualesPorMoneda(
                7L, LocalDate.of(2024, 12, 1), LocalDate.of(2024, 12, 31)
        )).thenReturn(List.of(new DashboardMonedaTotales(
                "MXN", new BigDecimal("900.00"), new BigDecimal("500.00")
        )));

        var resultado = dashboardService.obtenerComparacion(7L, 1, 2025);

        assertEquals(12, resultado.mesAnterior());
        assertEquals(2024, resultado.anioAnterior());
        var comparacion = resultado.porMoneda().get(0);
        assertEquals("MXN", comparacion.moneda());
        assertEquals(new BigDecimal("100.00"), comparacion.variacionGastos());
        assertEquals(new BigDecimal("20.00"), comparacion.variacionGastosPorcentaje());
    }

    @Test
    void noCalculaPorcentajeSiElPeriodoAnteriorNoTieneGastos() {
        when(transaccionRepository.findTotalesMensualesPorMoneda(
                7L, LocalDate.of(2025, 2, 1), LocalDate.of(2025, 2, 28)
        )).thenReturn(List.of(new DashboardMonedaTotales(
                "MXN", BigDecimal.ZERO, new BigDecimal("25.00")
        )));
        when(transaccionRepository.findTotalesMensualesPorMoneda(
                7L, LocalDate.of(2025, 1, 1), LocalDate.of(2025, 1, 31)
        )).thenReturn(List.of());

        var resultado = dashboardService.obtenerComparacion(7L, 2, 2025);

        assertNull(resultado.porMoneda().get(0).variacionGastosPorcentaje());
    }

    @Test
    void rechazaPeriodoInvalidoAntesDeConsultarMovimientos() {
        assertThrows(IllegalArgumentException.class,
                () -> dashboardService.obtenerComparacion(7L, 13, 2025));
        org.mockito.Mockito.verifyNoInteractions(transaccionRepository);
    }

    private Cuenta cuenta(Long id, TipoCuenta tipo, String moneda, String saldo) {
        return Cuenta.builder()
                .id(id)
                .nombre("Cuenta " + id)
                .tipo(tipo)
                .moneda(moneda)
                .saldoActual(new BigDecimal(saldo))
                .activo(true)
                .build();
    }
}
