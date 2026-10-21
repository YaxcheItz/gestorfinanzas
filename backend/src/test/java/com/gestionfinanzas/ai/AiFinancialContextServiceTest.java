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
import com.gestionfinanzas.service.ListaService;
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
        when(transaccionRepository.findTotalesMensualesPorMonedaFiltrado(7L,desde,hasta,null,null)).thenReturn(List.of(
                new DashboardMonedaTotales("MXN",new BigDecimal("1000.10"),new BigDecimal("300.21")),
                new DashboardMonedaTotales("USD",new BigDecimal("20"),new BigDecimal("5"))));
        when(transaccionRepository.findTotalesMensualesPorMonedaFiltrado(7L,previo,finPrevio,null,null)).thenReturn(List.of(
                new DashboardMonedaTotales("MXN",new BigDecimal("900.01"),new BigDecimal("400.32"))));
        var result=service.reporteLocal(7L,"COMPARACION_MENSUAL",desde,hasta,"MXN");
        assertTrue(result.answer().contains("2026-02-28"));
        assertTrue(result.answer().contains("diferencia 100.09"));
        assertTrue(result.answer().contains("diferencia -100.11"));
        assertFalse(result.answer().contains("USD"));
        org.junit.jupiter.api.Assertions.assertNull(result.action());
        verify(transaccionRepository).findTotalesMensualesPorMonedaFiltrado(7L,previo,finPrevio,null,null);
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
    private final ListaService listaService = mock(ListaService.class);
    private final AiFinancialContextService service =
            new AiFinancialContextService(
                    cuentaRepository, transaccionRepository, new ObjectMapper().findAndRegisterModules(),listaService
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
        when(transaccionRepository.findTotalesMensualesPorMonedaFiltrado(7L,desde,hasta,null,null)).thenReturn(List.of(
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
        when(transaccionRepository.findGastosPorCategoriaFiltrado(7L,fecha,fecha,null,null)).thenReturn(List.of());
        var resultado=service.reporteLocal(7L,"CATEGORIAS",fecha,fecha,null);
        assertTrue(resultado.answer().contains("No hay gastos"));
        org.junit.jupiter.api.Assertions.assertNull(resultado.report());
        verify(transaccionRepository).findGastosPorCategoriaFiltrado(7L,fecha,fecha,null,null);
    }

    @Test
    void evidenciaDeGastosSinCategoriaPermiteFiltrarCategoriaNula() {
        var fecha=java.time.LocalDate.of(2026,10,4);
        when(transaccionRepository.findGastosPorCategoriaFiltrado(7L,fecha,fecha,null,null)).thenReturn(List.of(
                new AiCategoriaAgregado(null,"Sin categoría","MXN",new BigDecimal("35.50"),2)));

        var resultado=service.reporteLocal(7L,"CATEGORIAS",fecha,fecha,null);

        var evidencia=resultado.evidence().getFirst();
        org.junit.jupiter.api.Assertions.assertTrue(evidencia.sinCategoria());
        org.junit.jupiter.api.Assertions.assertNull(evidencia.categoriaId());
        org.junit.jupiter.api.Assertions.assertEquals(2,evidencia.operaciones());
        org.junit.jupiter.api.Assertions.assertEquals(new BigDecimal("35.50"),evidencia.total());
    }

    @Test
    void evidenciaDelResumenConservaFiltrosYConteoDelServidor() {
        var desde=java.time.LocalDate.of(2026,10,1);var hasta=java.time.LocalDate.of(2026,10,4);
        when(transaccionRepository.findTotalesMensualesPorMonedaFiltrado(7L,desde,hasta,1L,8L))
                .thenReturn(List.of(new DashboardMonedaTotales("MXN",BigDecimal.ZERO,new BigDecimal("40.25"))));
        when(transaccionRepository.findConteosPorMonedaYTipoFiltrado(7L,desde,hasta,1L,8L))
                .thenReturn(List.of(new com.gestionfinanzas.dto.response.MovimientoConteo("MXN",TipoTransaccion.GASTO,2)));
        var result=service.reporteLocal(7L,"RESUMEN",desde,hasta,"MXN",1L,8L,"BBVA","Comida");
        var evidence=result.evidence().stream().filter(e->e.tipo()==TipoTransaccion.GASTO).findFirst().orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(2,evidence.operaciones());
        org.junit.jupiter.api.Assertions.assertEquals(new BigDecimal("40.25"),evidence.total());
        org.junit.jupiter.api.Assertions.assertEquals(1L,evidence.cuentaId());
        org.junit.jupiter.api.Assertions.assertEquals(8L,evidence.categoriaId());
        org.junit.jupiter.api.Assertions.assertEquals("BBVA",evidence.cuentaNombre());
        org.junit.jupiter.api.Assertions.assertEquals("Comida",evidence.categoriaNombre());
    }

    @Test
    void reporteDeListaValidaAccesoYConservaListaYAutorEnLaEvidencia() {
        var desde=java.time.LocalDate.of(2026,10,1);var hasta=desde.withDayOfMonth(31);
        var lista=new com.gestionfinanzas.dto.response.ListaResponse(12L,"Vacaciones","🌴","MXN",false,false,"EDITOR",List.of());
        when(listaService.listar(7L)).thenReturn(List.of(lista));
        when(listaService.leer(7L,12L)).thenReturn(null);
        when(transaccionRepository.findTotalesMensualesPorMonedaFiltradoEnLista(7L,12L,desde,hasta,null,null))
                .thenReturn(List.of(new DashboardMonedaTotales("MXN",BigDecimal.ZERO,new BigDecimal("40.25"))));
        when(transaccionRepository.findConteosPorMonedaYTipoEnLista(7L,12L,desde,hasta,null,null))
                .thenReturn(List.of(new com.gestionfinanzas.dto.response.MovimientoConteo("MXN",TipoTransaccion.GASTO,2)));

        var result=service.reporteLocal(7L,"RESUMEN",desde,hasta,"MXN",null,null,null,null,12L,"Vacaciones");

        var evidence=result.evidence().stream().filter(e->e.tipo()==TipoTransaccion.GASTO).findFirst().orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(12L,evidence.listaId());
        org.junit.jupiter.api.Assertions.assertEquals(7L,evidence.autorId());
        org.junit.jupiter.api.Assertions.assertEquals(2,evidence.operaciones());
        org.junit.jupiter.api.Assertions.assertEquals(new BigDecimal("40.25"),evidence.total());
        verify(listaService).leer(7L,12L);
    }
}
