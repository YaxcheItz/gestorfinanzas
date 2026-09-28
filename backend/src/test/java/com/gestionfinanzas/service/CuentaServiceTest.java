package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.CuentaRequest;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CuentaServiceTest {

    private final CuentaRepository cuentaRepository = mock(CuentaRepository.class);
    private final TransaccionRepository transaccionRepository = mock(TransaccionRepository.class);
    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final PlantillaRecurrenteRepository plantillaRepository = mock(PlantillaRecurrenteRepository.class);
    private final CuentaService cuentaService = new CuentaService(
            cuentaRepository, usuarioRepository, transaccionRepository, plantillaRepository
    );

    @Test
    void crearCuentaRegistraSaldoInicialComoMovimientoTrazable() {
        Usuario usuario = Usuario.builder().id(7L).build();
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(cuentaRepository.existsByUsuarioIdAndNombreIgnoreCase(7L, "Ahorro")).thenReturn(false);
        when(cuentaRepository.save(any(Cuenta.class))).thenAnswer(invocation -> {
            Cuenta cuenta = invocation.getArgument(0);
            cuenta.setId(3L);
            return cuenta;
        });

        cuentaService.crearCuenta(7L, new CuentaRequest(
                "Ahorro", TipoCuenta.AHORRO, "bbva", new BigDecimal("2.00"),
                new BigDecimal("300.00"), null, null, null,
                new BigDecimal("1250.00"), "MXN", null
        ));

        ArgumentCaptor<Cuenta> cuentaCaptor = ArgumentCaptor.forClass(Cuenta.class);
        verify(cuentaRepository).save(cuentaCaptor.capture());
        assertEquals("bbva", cuentaCaptor.getValue().getInstitucionFinanciera());
        assertEquals(new BigDecimal("2.00"), cuentaCaptor.getValue().getCashbackPorcentaje());
        assertEquals(new BigDecimal("300.00"), cuentaCaptor.getValue().getCashbackLimiteMensual());

        ArgumentCaptor<Transaccion> captor = ArgumentCaptor.forClass(Transaccion.class);
        verify(transaccionRepository).save(captor.capture());
        assertEquals(TipoTransaccion.SALDO_INICIAL, captor.getValue().getTipo());
        assertEquals(new BigDecimal("1250.00"), captor.getValue().getMonto());
        assertEquals(3L, captor.getValue().getCuenta().getId());
        assertEquals(usuario, captor.getValue().getUsuario());
    }

    @Test
    void rechazaNombreDuplicadoSinDistinguirMayusculas() {
        Usuario usuario = Usuario.builder().id(7L).build();
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(cuentaRepository.existsByUsuarioIdAndNombreIgnoreCase(7L, "santander oro")).thenReturn(true);

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () ->
                cuentaService.crearCuenta(7L, new CuentaRequest(
                        " santander oro ", TipoCuenta.CREDITO, "santander",
                        null, null, new BigDecimal("25000.00"), 10, 1,
                        null, "MXN", null
                ))
        );

        assertEquals("Ya existe una cuenta con el nombre 'santander oro'", error.getMessage());
        org.mockito.Mockito.verify(cuentaRepository, org.mockito.Mockito.never()).save(any(Cuenta.class));
    }

    @Test
    void permiteNombresDistintosEnElMismoBanco() {
        Usuario usuario = Usuario.builder().id(7L).build();
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(cuentaRepository.existsByUsuarioIdAndNombreIgnoreCase(7L, "Santander Oro")).thenReturn(false);
        when(cuentaRepository.save(any(Cuenta.class))).thenAnswer(invocation -> invocation.getArgument(0));

        cuentaService.crearCuenta(7L, new CuentaRequest(
                "Santander Oro", TipoCuenta.CREDITO, "santander",
                null, null, new BigDecimal("25000.00"), 10, 1,
                null, "MXN", null
        ));

        ArgumentCaptor<Cuenta> cuentaCaptor = ArgumentCaptor.forClass(Cuenta.class);
        verify(cuentaRepository).save(cuentaCaptor.capture());
        assertEquals("Santander Oro", cuentaCaptor.getValue().getNombre());
        assertEquals("santander", cuentaCaptor.getValue().getInstitucionFinanciera());
    }

    @Test
    void crearTarjetaRegistraDeudaInicialNegativaYLlenaDatosDeCredito() {
        Usuario usuario = Usuario.builder().id(7L).build();
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(cuentaRepository.existsByUsuarioIdAndNombreIgnoreCase(7L, "Santander")).thenReturn(false);
        when(cuentaRepository.save(any(Cuenta.class))).thenAnswer(invocation -> {
            Cuenta cuenta = invocation.getArgument(0);
            cuenta.setId(4L);
            return cuenta;
        });

        cuentaService.crearCuenta(7L, new CuentaRequest(
                "Santander", TipoCuenta.CREDITO, "santander",
                new BigDecimal("2.50"), new BigDecimal("300.00"),
                new BigDecimal("25000.00"), 10, 1,
                new BigDecimal("3500.00"), "MXN", null
        ));

        ArgumentCaptor<Cuenta> cuentaCaptor = ArgumentCaptor.forClass(Cuenta.class);
        verify(cuentaRepository).save(cuentaCaptor.capture());
        assertEquals(new BigDecimal("-3500.00"), cuentaCaptor.getValue().getSaldoActual());
        assertEquals(new BigDecimal("25000.00"), cuentaCaptor.getValue().getLimiteCredito());
        assertEquals(10, cuentaCaptor.getValue().getDiaCorte());
        assertEquals(1, cuentaCaptor.getValue().getDiaPago());
        assertEquals(new BigDecimal("2.50"), cuentaCaptor.getValue().getCashbackPorcentaje());
        assertEquals(new BigDecimal("300.00"), cuentaCaptor.getValue().getCashbackLimiteMensual());

        ArgumentCaptor<Transaccion> transaccionCaptor = ArgumentCaptor.forClass(Transaccion.class);
        verify(transaccionRepository).save(transaccionCaptor.capture());
        assertEquals(new BigDecimal("3500.00"), transaccionCaptor.getValue().getMonto());
        assertEquals(TipoTransaccion.SALDO_INICIAL, transaccionCaptor.getValue().getTipo());
    }

    @Test
    void actualizarTarjetaGuardaBeneficiosYDatosDeCredito() {
        Cuenta tarjeta = Cuenta.builder()
                .id(4L)
                .nombre("Santander")
                .institucionFinanciera("santander")
                .tipo(TipoCuenta.CREDITO)
                .saldoActual(new BigDecimal("-3500.00"))
                .moneda("MXN")
                .activo(true)
                .build();
        when(cuentaRepository.findByIdAndUsuarioId(4L, 7L)).thenReturn(Optional.of(tarjeta));
        when(cuentaRepository.save(any(Cuenta.class))).thenAnswer(invocation -> invocation.getArgument(0));

        cuentaService.actualizarCuenta(7L, 4L, new CuentaRequest(
                "Santander", TipoCuenta.CREDITO, "santander",
                new BigDecimal("2.50"), new BigDecimal("300.00"),
                new BigDecimal("25000.00"), 10, 1,
                null, "MXN", "Tarjeta principal"
        ));

        ArgumentCaptor<Cuenta> cuentaCaptor = ArgumentCaptor.forClass(Cuenta.class);
        verify(cuentaRepository).save(cuentaCaptor.capture());
        assertEquals(new BigDecimal("2.50"), cuentaCaptor.getValue().getCashbackPorcentaje());
        assertEquals(new BigDecimal("300.00"), cuentaCaptor.getValue().getCashbackLimiteMensual());
        assertEquals(new BigDecimal("25000.00"), cuentaCaptor.getValue().getLimiteCredito());
        assertEquals(10, cuentaCaptor.getValue().getDiaCorte());
        assertEquals(1, cuentaCaptor.getValue().getDiaPago());
    }

    @Test
    void crearTarjetaRequiereLimiteDeCredito() {
        assertEquals("El límite de crédito es obligatorio para una tarjeta de crédito",
                org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class, () ->
                        cuentaService.crearCuenta(7L, new CuentaRequest(
                                "Santander", TipoCuenta.CREDITO, "santander", null, null,
                                null, 10, 1, null, "MXN", null
                        ))
                ).getMessage());
    }

    @Test
    void crearTarjetaRequiereDiaDeCorte() {
        assertEquals("El día de corte es obligatorio para una tarjeta de crédito",
                assertThrows(IllegalArgumentException.class, () ->
                        cuentaService.crearCuenta(7L, new CuentaRequest(
                                "Santander", TipoCuenta.CREDITO, "santander", null, null,
                                new BigDecimal("25000.00"), null, 1, null, "MXN", null
                        ))
                ).getMessage());
    }

    @Test
    void crearTarjetaRequiereDiaDePago() {
        assertEquals("El día de pago es obligatorio para una tarjeta de crédito",
                assertThrows(IllegalArgumentException.class, () ->
                        cuentaService.crearCuenta(7L, new CuentaRequest(
                                "Santander", TipoCuenta.CREDITO, "santander", null, null,
                                new BigDecimal("25000.00"), 10, null, null, "MXN", null
                        ))
                ).getMessage());
    }

    @Test
    void creaTarjetaConCashbackCeroCuandoNoSeEspecifica() {
        Usuario usuario = Usuario.builder().id(7L).build();
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(cuentaRepository.existsByUsuarioIdAndNombreIgnoreCase(7L, "Santander")).thenReturn(false);
        when(cuentaRepository.save(any(Cuenta.class))).thenAnswer(invocation -> invocation.getArgument(0));

        cuentaService.crearCuenta(7L, new CuentaRequest(
                "Santander", TipoCuenta.CREDITO, "santander", null, null,
                new BigDecimal("25000.00"), 10, 1, null, "MXN", null
        ));

        ArgumentCaptor<Cuenta> cuentaCaptor = ArgumentCaptor.forClass(Cuenta.class);
        verify(cuentaRepository).save(cuentaCaptor.capture());
        assertEquals(BigDecimal.ZERO, cuentaCaptor.getValue().getCashbackPorcentaje());
    }

    @Test
    void rechazaLimiteMenorQueLaDeudaInicial() {
        assertEquals("El límite de crédito no puede ser menor que la deuda actual",
                assertThrows(IllegalArgumentException.class, () ->
                        cuentaService.crearCuenta(7L, new CuentaRequest(
                                "Santander", TipoCuenta.CREDITO, "santander", null, null,
                                new BigDecimal("1000.00"), 10, 1,
                                new BigDecimal("1200.00"), "MXN", null
                        ))
                ).getMessage());
    }

    @Test
    void rechazaReducirLimitePorDebajoDeLaDeudaActual() {
        Cuenta tarjeta = Cuenta.builder()
                .id(4L)
                .nombre("Santander")
                .institucionFinanciera("santander")
                .tipo(TipoCuenta.CREDITO)
                .saldoActual(new BigDecimal("-3500.00"))
                .moneda("MXN")
                .activo(true)
                .build();
        when(cuentaRepository.findByIdAndUsuarioId(4L, 7L)).thenReturn(Optional.of(tarjeta));

        assertEquals("El límite de crédito no puede ser menor que la deuda actual",
                assertThrows(IllegalArgumentException.class, () ->
                        cuentaService.actualizarCuenta(7L, 4L, new CuentaRequest(
                                "Santander", TipoCuenta.CREDITO, "santander", null, null,
                                new BigDecimal("3000.00"), 10, 1, null, "MXN", null
                        ))
                ).getMessage());
    }

    @Test
    void noPermiteCambiarTipoDeCuentaAlEditar() {
        Cuenta cuentaExistente = Cuenta.builder()
                .id(3L)
                .nombre("Ahorro")
                .tipo(TipoCuenta.AHORRO)
                .saldoActual(BigDecimal.ZERO)
                .moneda("MXN")
                .activo(true)
                .build();
        when(cuentaRepository.findByIdAndUsuarioId(3L, 7L)).thenReturn(Optional.of(cuentaExistente));

        assertEquals("No se puede cambiar el tipo de una cuenta existente",
                assertThrows(IllegalArgumentException.class, () ->
                        cuentaService.actualizarCuenta(7L, 3L, new CuentaRequest(
                                "Ahorro", TipoCuenta.INVERSION, null, null, null,
                                null, null, null, null, "MXN", null
                        ))
                ).getMessage());
        org.mockito.Mockito.verify(cuentaRepository, org.mockito.Mockito.never()).save(any(Cuenta.class));
    }

    @Test
    void noPermiteCambiarInstitucionDeCuentaAlEditar() {
        Cuenta cuentaExistente = Cuenta.builder()
                .id(3L)
                .nombre("Ahorro")
                .institucionFinanciera("bbva")
                .tipo(TipoCuenta.AHORRO)
                .saldoActual(BigDecimal.ZERO)
                .moneda("MXN")
                .activo(true)
                .build();
        when(cuentaRepository.findByIdAndUsuarioId(3L, 7L)).thenReturn(Optional.of(cuentaExistente));

        assertEquals("No se puede cambiar la institución de una cuenta existente",
                assertThrows(IllegalArgumentException.class, () ->
                        cuentaService.actualizarCuenta(7L, 3L, new CuentaRequest(
                                "Ahorro", TipoCuenta.AHORRO, "santander", null, null,
                                null, null, null, null, "MXN", null
                        ))
                ).getMessage());
        org.mockito.Mockito.verify(cuentaRepository, org.mockito.Mockito.never()).save(any(Cuenta.class));
    }

    @Test
    void eliminaCuentaSinSaldoPreservaReferenciasHistoricasDeMovimientos() {
        Cuenta cuenta = Cuenta.builder()
                .id(8L)
                .nombre("Ahorro viejo")
                .tipo(TipoCuenta.AHORRO)
                .moneda("MXN")
                .saldoActual(BigDecimal.ZERO)
                .activo(false)
                .build();
        Cuenta destino = Cuenta.builder()
                .id(9L)
                .nombre("Cuenta destino")
                .tipo(TipoCuenta.DEBITO)
                .moneda("USD")
                .saldoActual(BigDecimal.ZERO)
                .activo(true)
                .build();
        Transaccion movimiento = Transaccion.builder()
                .id(20L)
                .cuenta(cuenta)
                .cuentaDestino(destino)
                .build();
        when(cuentaRepository.findByIdAndUsuarioId(8L, 7L)).thenReturn(Optional.of(cuenta));
        when(transaccionRepository.findByCuentaIdOrCuentaDestinoId(8L, 8L))
                .thenReturn(java.util.List.of(movimiento));

        cuentaService.eliminarCuenta(7L, 8L);

        assertEquals(null, movimiento.getCuenta());
        assertEquals("Ahorro viejo", movimiento.getCuentaNombreHistorico());
        assertEquals("MXN", movimiento.getCuentaMonedaHistorica());
        assertEquals(destino, movimiento.getCuentaDestino());
        verify(transaccionRepository).saveAll(java.util.List.of(movimiento));
        verify(plantillaRepository).deleteByCuentaId(8L);
        verify(cuentaRepository).delete(cuenta);
    }

    @Test
    void noEliminaCuentaConSaldoODeudaPendiente() {
        Cuenta cuenta = Cuenta.builder()
                .id(8L)
                .nombre("Tarjeta")
                .tipo(TipoCuenta.CREDITO)
                .moneda("MXN")
                .saldoActual(new BigDecimal("-10.00"))
                .activo(true)
                .build();
        when(cuentaRepository.findByIdAndUsuarioId(8L, 7L)).thenReturn(Optional.of(cuenta));

        assertEquals("La cuenta debe tener saldo 0 para poder eliminarse. Transfiere el dinero o liquida la deuda primero",
                assertThrows(IllegalArgumentException.class, () -> cuentaService.eliminarCuenta(7L, 8L)).getMessage());

        verify(transaccionRepository, never()).findByCuentaIdOrCuentaDestinoId(8L, 8L);
        verify(cuentaRepository, never()).delete(cuenta);
        verify(plantillaRepository, never()).deleteByCuentaId(8L);
    }
}
