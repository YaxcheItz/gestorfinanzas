package com.gestionfinanzas.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiFinancialContextServiceTest {
    @Test
    void comparacionRespetaTramosMonedasYCifrasDecimales() {
        var desde=java.time.LocalDate.of(2026,3,1);var hasta=java.time.LocalDate.of(2026,3,31);
        var previo=java.time.LocalDate.of(2026,2,1);var finPrevio=java.time.LocalDate.of(2026,2,28);
        when(transaccionRepository.findTotalesMensualesPorMoneda(7L,desde,hasta)).thenReturn(List.of(
                new DashboardMonedaTotales("MXN",new BigDecimal("1000.10"),new BigDecimal("300.21")),
                new DashboardMonedaTotales("USD",new BigDecimal("20"),new BigDecimal("5"))));
        when(transaccionRepository.findTotalesMensualesPorMoneda(7L,previo,finPrevio)).thenReturn(List.of(
                new DashboardMonedaTotales("MXN",new BigDecimal("900.01"),new BigDecimal("400.32"))));
        var result=service.reporteLocal(7L,"COMPARACION_MENSUAL",desde,hasta,"MXN");
        assertTrue(result.answer().contains("2026-02-28"));
        assertTrue(result.answer().contains("diferencia 100.09"));
        assertTrue(result.answer().contains("diferencia -100.11"));
        assertFalse(result.answer().contains("USD"));
        org.junit.jupiter.api.Assertions.assertNull(result.action());
        verify(transaccionRepository).findTotalesMensualesPorMoneda(7L,previo,finPrevio);
        org.mockito.Mockito.verifyNoInteractions(cuentaRepository);
    }

    @Test
    void comparacionCruzaAnioSinInventarMovimientos() {
        var desde=java.time.LocalDate.of(2026,1,1);var hasta=java.time.LocalDate.of(2026,1,4);
        when(transaccionRepository.findTotalesMensualesPorMoneda(7L,desde,hasta)).thenReturn(List.of());
        when(transaccionRepository.findTotalesMensualesPorMoneda(7L,java.time.LocalDate.of(2025,12,1),java.time.LocalDate.of(2025,12,4))).thenReturn(List.of());
        var result=service.reporteLocal(7L,"COMPARACION_MENSUAL",desde,hasta,null);
        assertTrue(result.answer().contains("2025-12-04"));
        assertTrue(result.answer().contains("No hay ingresos ni gastos"));
        org.junit.jupiter.api.Assertions.assertNull(result.report());
    }

    @Test
    void comparacionNoConsultaUnRangoInvalido() {
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class, () -> service.reporteLocal(7L,"COMPARACION_MENSUAL",java.time.LocalDate.of(2026,1,2),java.time.LocalDate.of(2026,2,1),null));
        org.mockito.Mockito.verifyNoInteractions(transaccionRepository);
    }

    private final CuentaRepository cuentaRepository = mock(CuentaRepository.class);
    private final TransaccionRepository transaccionRepository = mock(TransaccionRepository.class);
    private final AiFinancialContextService service =
            new AiFinancialContextService(
                    cuentaRepository, transaccionRepository, new ObjectMapper().findAndRegisterModules()
            );

    @Test
    void buildContextIncluyeSoloResumenFinancieroAgregadoDelUsuario() {
        Cuenta account = Cuenta.builder()
                .nombre("Cuenta diaria")
                .tipo(TipoCuenta.DEBITO)
                .saldoActual(new BigDecimal("2500.00"))
                .moneda("MXN")
                .institucionFinanciera("Institucion privada")
                .descripcion("Descripción privada")
                .build();
        YearMonth currentMonth = YearMonth.now();
        when(cuentaRepository.findByUsuarioIdAndActivoTrue(7L)).thenReturn(List.of(account));
        when(transaccionRepository.findTotalesMensualesPorMoneda(
                7L, currentMonth.atDay(1), currentMonth.atEndOfMonth()
        )).thenReturn(List.of(new DashboardMonedaTotales(
                "MXN", new BigDecimal("1000.00"), new BigDecimal("250.00")
        )));
        when(transaccionRepository.findGastosPorCategoria(
                7L, TipoTransaccion.GASTO, currentMonth.atDay(1), currentMonth.atEndOfMonth()
        )).thenReturn(List.of(new DashboardGastoCategoriaResponse(
                3L, "Comida", "#00aa00", new BigDecimal("250.00"), "MXN"
        )));
        when(transaccionRepository.sumMontosPorUsuarioYTipoAgrupadosPorMes(
                7L,
                List.of(TipoTransaccion.INGRESO, TipoTransaccion.GASTO),
                currentMonth.minusMonths(5).atDay(1),
                currentMonth.atEndOfMonth()
        )).thenReturn(List.of(new DashboardMesTipoTotal(
                currentMonth.getYear(), currentMonth.getMonthValue(),
                TipoTransaccion.GASTO, new BigDecimal("250.00"), "MXN"
        )));

        String context = service.buildContext(7L);

        assertTrue(context.contains("Cuenta diaria"));
        assertTrue(context.contains("2500.00"));
        assertTrue(context.contains("Comida"));
        assertFalse(context.contains("\"categoriaId\""));
        assertFalse(context.contains("#00aa00"));
        assertFalse(context.contains("Institucion privada"));
        assertFalse(context.contains("Descripción privada"));
        verify(cuentaRepository).findByUsuarioIdAndActivoTrue(7L);
        verify(transaccionRepository).sumMontosPorUsuarioYTipoAgrupadosPorMes(
                7L,
                List.of(TipoTransaccion.INGRESO, TipoTransaccion.GASTO),
                currentMonth.minusMonths(5).atDay(1),
                currentMonth.atEndOfMonth()
        );
    }
    @Test
    void reporteLocalSeparaMonedasYRespetaUsuarioYPeriodo() {
        var desde=java.time.LocalDate.of(2026,10,1);var hasta=desde.plusDays(3);
        when(transaccionRepository.findTotalesMensualesPorMoneda(7L,desde,hasta)).thenReturn(List.of(
            new DashboardMonedaTotales("MXN",new BigDecimal("1000"),new BigDecimal("80")),
            new DashboardMonedaTotales("USD",new BigDecimal("50"),new BigDecimal("2"))));
        var resultado=service.reporteLocal(7L,"RESUMEN",desde,hasta,null);
        org.junit.jupiter.api.Assertions.assertNull(resultado.report());
        assertTrue(resultado.answer().contains("MXN"));assertTrue(resultado.answer().contains("USD"));
        var filtrado=service.reporteLocal(7L,"RESUMEN",desde,hasta,"MXN");
        org.junit.jupiter.api.Assertions.assertEquals("MXN",filtrado.report().unit());
        org.junit.jupiter.api.Assertions.assertEquals(List.of(1000.0,80.0),filtrado.report().values());
    }
    @Test
    void reporteDeCategoriasUsaAgregadoPropioSinInventarDatos() {
        var fecha=java.time.LocalDate.of(2026,10,4);
        when(transaccionRepository.findGastosPorCategoria(7L,TipoTransaccion.GASTO,fecha,fecha)).thenReturn(List.of());
        var resultado=service.reporteLocal(7L,"CATEGORIAS",fecha,fecha,null);
        assertTrue(resultado.answer().contains("No hay gastos"));
        org.junit.jupiter.api.Assertions.assertNull(resultado.report());
        verify(transaccionRepository).findGastosPorCategoria(7L,TipoTransaccion.GASTO,fecha,fecha);
    }
}
