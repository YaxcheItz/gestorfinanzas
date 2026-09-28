package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.response.TransaccionResponse;
import com.gestionfinanzas.model.entity.AsientoContable;
import com.gestionfinanzas.model.enums.LadoContable;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.AsientoContableRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class LibroDiarioServiceTest {

    private final AsientoContableRepository asientoRepository = mock(AsientoContableRepository.class);
    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final LibroDiarioService libroDiarioService =
            new LibroDiarioService(asientoRepository, usuarioRepository);

    @Test
    void registraGastoConDebeYHaberEnLaMonedaDelMovimiento() {
        libroDiarioService.registrarCreacion(7L, movimiento(
                11L, TipoTransaccion.GASTO, "125.50", "MXN", null, null, 4L, "Comida"
        ));

        AsientoContable asiento = guardarCapturado();
        assertEquals("CREACION", asiento.getTipoEvento());
        assertEquals(2, asiento.getLineas().size());
        assertPartida(asiento, "GASTO:4", "125.50", "MXN", LadoContable.DEBE);
        assertPartida(asiento, "CUENTA:2", "125.50", "MXN", LadoContable.HABER);
        assertBalanceado(asiento);
    }

    @Test
    void registraTransferenciaEntreMonedasUsandoUnaCuentaPuentePorMoneda() {
        libroDiarioService.registrarCreacion(7L, movimiento(
                12L, TipoTransaccion.TRANSFERENCIA, "100.00", "USD",
                "1750.00", "17.50000000", null, null
        ));

        AsientoContable asiento = guardarCapturado();
        assertEquals(4, asiento.getLineas().size());
        assertPartida(asiento, "CUENTA:3", "1750.00", "MXN", LadoContable.DEBE);
        assertPartida(asiento, "PUENTE:CAMBIO:MXN", "1750.00", "MXN", LadoContable.HABER);
        assertPartida(asiento, "PUENTE:CAMBIO:USD", "100.00", "USD", LadoContable.DEBE);
        assertPartida(asiento, "CUENTA:2", "100.00", "USD", LadoContable.HABER);
        assertEquals(new BigDecimal("17.50000000"), asiento.getTasaCambio());
        assertBalanceado(asiento);
    }

    @Test
    void unaCorreccionRevierteLaVersionAnteriorYRegistraLaNuevaEnElMismoAsiento() {
        TransaccionResponse antes = movimiento(
                13L, TipoTransaccion.GASTO, "80.00", "MXN", null, null, 4L, "Comida"
        );
        TransaccionResponse despues = movimiento(
                13L, TipoTransaccion.INGRESO, "95.00", "MXN", null, null, 5L, "Reembolso"
        );

        libroDiarioService.registrarActualizacion(7L, antes, despues);

        AsientoContable asiento = guardarCapturado();
        assertEquals("ACTUALIZACION", asiento.getTipoEvento());
        assertEquals(4, asiento.getLineas().size());
        assertPartida(asiento, "GASTO:4", "80.00", "MXN", LadoContable.HABER);
        assertPartida(asiento, "CUENTA:2", "80.00", "MXN", LadoContable.DEBE);
        assertPartida(asiento, "CUENTA:2", "95.00", "MXN", LadoContable.DEBE);
        assertPartida(asiento, "INGRESO:5", "95.00", "MXN", LadoContable.HABER);
        assertBalanceado(asiento);
    }

    @Test
    void saldoInicialDeTarjetaRegistraLaDeudaComoHaber() {
        libroDiarioService.registrarSaldoInicial(7L, movimiento(
                14L, TipoTransaccion.SALDO_INICIAL, "500.00", "MXN", null, null, null, null
        ), true);

        AsientoContable asiento = guardarCapturado();
        assertEquals("SALDO_INICIAL", asiento.getTipoEvento());
        assertPartida(asiento, "CUENTA:2", "500.00", "MXN", LadoContable.HABER);
        assertPartida(asiento, "PATRIMONIO:SALDOS_INICIALES", "500.00", "MXN", LadoContable.DEBE);
        assertBalanceado(asiento);
    }

    @Test
    void rechazoTransferenciaEnUnaMonedaConMontosDistintos() {
        TransaccionResponse movimiento = new TransaccionResponse(
                15L, 2L, "Cuenta origen", 3L, "Cuenta destino", null, null, null, null,
                TipoTransaccion.TRANSFERENCIA, new BigDecimal("100.00"), new BigDecimal("99.00"),
                null, "MXN", "MXN", LocalDate.of(2025, 1, 2), "Transferencia", null, false, null
        );

        assertThrows(IllegalArgumentException.class,
                () -> libroDiarioService.registrarCreacion(7L, movimiento));
    }

    private TransaccionResponse movimiento(Long id, TipoTransaccion tipo, String monto, String moneda,
                                           String montoDestino, String tasaCambio, Long categoriaId,
                                           String categoriaNombre) {
        boolean transferencia = tipo == TipoTransaccion.TRANSFERENCIA;
        return new TransaccionResponse(
                id,
                2L,
                "Cuenta origen",
                transferencia ? 3L : null,
                transferencia ? "Cuenta destino" : null,
                categoriaId,
                categoriaNombre,
                null,
                null,
                tipo,
                new BigDecimal(monto),
                montoDestino == null ? null : new BigDecimal(montoDestino),
                tasaCambio == null ? null : new BigDecimal(tasaCambio),
                moneda,
                transferencia ? "MXN" : null,
                LocalDate.of(2025, 1, 2),
                "Movimiento de prueba",
                null,
                false,
                null
        );
    }

    private AsientoContable guardarCapturado() {
        var captor = org.mockito.ArgumentCaptor.forClass(AsientoContable.class);
        verify(asientoRepository).save(captor.capture());
        return captor.getValue();
    }

    private void assertPartida(AsientoContable asiento, String codigo, String monto,
                               String moneda, LadoContable lado) {
        var partida = asiento.getLineas().stream()
                .filter(linea -> linea.getCodigoCuenta().equals(codigo)
                        && linea.getMoneda().equals(moneda)
                        && linea.getLado() == lado
                        && linea.getMonto().equals(new BigDecimal(monto)))
                .findFirst()
                .orElseThrow();
        assertEquals(new BigDecimal(monto), partida.getMonto());
    }

    private void assertBalanceado(AsientoContable asiento) {
        Map<String, BigDecimal[]> totales = asiento.getLineas().stream()
                .collect(Collectors.groupingBy(
                        linea -> linea.getMoneda(),
                        Collectors.collectingAndThen(Collectors.toList(), partidas -> {
                            BigDecimal debe = partidas.stream()
                                    .filter(linea -> linea.getLado() == LadoContable.DEBE)
                                    .map(linea -> linea.getMonto())
                                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                            BigDecimal haber = partidas.stream()
                                    .filter(linea -> linea.getLado() == LadoContable.HABER)
                                    .map(linea -> linea.getMonto())
                                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                            return new BigDecimal[] { debe, haber };
                        })
                ));
        for (BigDecimal[] saldo : totales.values()) {
            assertEquals(0, saldo[0].compareTo(saldo[1]));
        }
    }
}
