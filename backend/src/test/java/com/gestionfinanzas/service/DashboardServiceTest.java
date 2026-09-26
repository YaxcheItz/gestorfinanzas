package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.response.DashboardGastoCategoriaResponse;
import com.gestionfinanzas.dto.response.DashboardMesTipoTotal;
import com.gestionfinanzas.dto.response.DashboardMonedaTotales;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DashboardServiceTest {

    private final CuentaRepository cuentaRepository = mock(CuentaRepository.class);
    private final TransaccionRepository transaccionRepository = mock(TransaccionRepository.class);
    private final DashboardService dashboardService = new DashboardService(cuentaRepository, transaccionRepository);

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
}
