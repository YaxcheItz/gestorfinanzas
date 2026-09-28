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
}
