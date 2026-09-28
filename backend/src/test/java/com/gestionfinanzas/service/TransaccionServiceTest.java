package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.TransaccionRequest;
import com.gestionfinanzas.dto.request.TransaccionFiltroRequest;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.dto.response.TransaccionResponse;
import com.gestionfinanzas.model.entity.PlantillaRecurrente;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.FrecuenciaRecurrencia;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TransaccionServiceTest {

    private final TransaccionRepository transaccionRepository = mock(TransaccionRepository.class);
    private final CuentaRepository cuentaRepository = mock(CuentaRepository.class);
    private final CategoriaRepository categoriaRepository = mock(CategoriaRepository.class);
    private final PlantillaRecurrenteRepository plantillaRepository = mock(PlantillaRecurrenteRepository.class);
    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final AuditoriaTransaccionService auditoriaService = mock(AuditoriaTransaccionService.class);
    private final TransaccionService transaccionService = new TransaccionService(
            transaccionRepository, cuentaRepository, categoriaRepository, usuarioRepository, plantillaRepository,
            auditoriaService
    );

    @Test
    void transferenciaEntreMonedasAplicaTasaYAlmacenaMontoDestino() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Cuenta origen = cuenta(1L, usuario, "USD", "500.00");
        Cuenta destino = cuenta(2L, usuario, "MXN", "1000.00");
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(cuentaRepository.findByIdAndUsuarioId(1L, 7L)).thenReturn(Optional.of(origen));
        when(cuentaRepository.findByIdAndUsuarioId(2L, 7L)).thenReturn(Optional.of(destino));
        when(transaccionRepository.save(any(Transaccion.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = transaccionService.crearTransaccion(7L, new TransaccionRequest(
                1L, 2L, null, TipoTransaccion.TRANSFERENCIA, new BigDecimal("100.00"),
                new BigDecimal("17.50"), LocalDate.now(), "Transferencia", null, null, null
        ));

        assertEquals(new BigDecimal("400.00"), origen.getSaldoActual());
        assertEquals(new BigDecimal("2750.00"), destino.getSaldoActual());
        assertEquals(new BigDecimal("1750.00"), response.montoDestino());
        assertEquals(new BigDecimal("17.50"), response.tasaCambio());
        assertEquals("USD", response.moneda());
        assertEquals("MXN", response.monedaDestino());
        verify(auditoriaService).registrar(
                eq(7L), isNull(), eq("CREAR"), isNull(), any(TransaccionResponse.class)
        );
    }

    @Test
    void eliminarTransferenciaRevierteElMontoConvertidoEnLaCuentaDestino() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Cuenta origen = cuenta(1L, usuario, "USD", "400.00");
        Cuenta destino = cuenta(2L, usuario, "MXN", "2750.00");
        Transaccion transaccion = Transaccion.builder()
                .id(11L)
                .usuario(usuario)
                .cuenta(origen)
                .cuentaDestino(destino)
                .tipo(TipoTransaccion.TRANSFERENCIA)
                .monto(new BigDecimal("100.00"))
                .montoDestino(new BigDecimal("1750.00"))
                .fecha(LocalDate.now())
                .descripcion("Transferencia")
                .build();
        when(transaccionRepository.findByIdAndUsuarioId(11L, 7L)).thenReturn(Optional.of(transaccion));

        transaccionService.eliminarTransaccion(7L, 11L);

        assertEquals(new BigDecimal("500.00"), origen.getSaldoActual());
        assertEquals(new BigDecimal("1000.00"), destino.getSaldoActual());
    }

    @Test
    void actualizarGastoRecalculaSaldoYConservaLaTransaccion() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Cuenta cuenta = cuenta(1L, usuario, "MXN", "85.00");
        Categoria categoria = Categoria.builder().id(4L).usuario(usuario).nombre("Comida")
                .tipo(TipoTransaccion.GASTO).activo(true).build();
        Transaccion transaccion = Transaccion.builder()
                .id(11L).usuario(usuario).cuenta(cuenta).categoria(categoria)
                .tipo(TipoTransaccion.GASTO).monto(new BigDecimal("15.00"))
                .fecha(LocalDate.of(2026, 9, 25)).descripcion("Gasto original").build();
        when(transaccionRepository.findByIdAndUsuarioId(11L, 7L)).thenReturn(Optional.of(transaccion));
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(cuentaRepository.findByIdAndUsuarioId(1L, 7L)).thenReturn(Optional.of(cuenta));
        when(categoriaRepository.findAccessibleById(4L, 7L)).thenReturn(Optional.of(categoria));
        when(transaccionRepository.save(any(Transaccion.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = transaccionService.actualizarTransaccion(7L, 11L, new TransaccionRequest(
                1L, null, 4L, TipoTransaccion.GASTO, new BigDecimal("25.00"),
                null, LocalDate.of(2026, 9, 26), "Gasto corregido", " nota ", null, null
        ));

        assertEquals(11L, response.id());
        assertEquals(new BigDecimal("75.00"), cuenta.getSaldoActual());
        assertEquals(new BigDecimal("25.00"), response.monto());
        assertEquals("Comida", response.descripcion());
        assertEquals("nota", response.notas());
        assertEquals(LocalDate.of(2026, 9, 26), response.fecha());
    }

    @Test
    void actualizarTransferenciaRevierteOrigenYDestinoAntesDeAplicarCambios() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Cuenta origen = cuenta(1L, usuario, "USD", "400.00");
        Cuenta destino = cuenta(2L, usuario, "MXN", "2750.00");
        Transaccion transaccion = Transaccion.builder()
                .id(11L).usuario(usuario).cuenta(origen).cuentaDestino(destino)
                .tipo(TipoTransaccion.TRANSFERENCIA).monto(new BigDecimal("100.00"))
                .montoDestino(new BigDecimal("1750.00")).tasaCambio(new BigDecimal("17.50"))
                .fecha(LocalDate.now()).descripcion("Transferencia original").build();
        when(transaccionRepository.findByIdAndUsuarioId(11L, 7L)).thenReturn(Optional.of(transaccion));
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(cuentaRepository.findByIdAndUsuarioId(1L, 7L)).thenReturn(Optional.of(origen));
        when(cuentaRepository.findByIdAndUsuarioId(2L, 7L)).thenReturn(Optional.of(destino));
        when(transaccionRepository.save(any(Transaccion.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        transaccionService.actualizarTransaccion(7L, 11L, new TransaccionRequest(
                1L, 2L, null, TipoTransaccion.TRANSFERENCIA, new BigDecimal("120.00"),
                new BigDecimal("18.00"), LocalDate.now(), "Transferencia corregida", null, null, null
        ));

        assertEquals(new BigDecimal("380.00"), origen.getSaldoActual());
        assertEquals(new BigDecimal("3160.00"), destino.getSaldoActual());
        assertEquals(new BigDecimal("2160.00"), transaccion.getMontoDestino());
        assertEquals(new BigDecimal("18.00"), transaccion.getTasaCambio());
    }

    @Test
    void saldoInicialNoSePuedeEditar() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Cuenta cuenta = cuenta(1L, usuario, "MXN", "100.00");
        Transaccion transaccion = Transaccion.builder()
                .id(11L).usuario(usuario).cuenta(cuenta).tipo(TipoTransaccion.SALDO_INICIAL)
                .monto(new BigDecimal("100.00")).fecha(LocalDate.now())
                .descripcion("Saldo inicial").build();
        when(transaccionRepository.findByIdAndUsuarioId(11L, 7L)).thenReturn(Optional.of(transaccion));

        assertThrows(IllegalArgumentException.class, () -> transaccionService.actualizarTransaccion(
                7L, 11L, new TransaccionRequest(
                        1L, null, null, TipoTransaccion.INGRESO, new BigDecimal("100.00"),
                        null, LocalDate.now(), "Ingreso", null, null, null
                )
        ));

        assertEquals(new BigDecimal("100.00"), cuenta.getSaldoActual());
        verify(cuentaRepository, never()).save(any(Cuenta.class));
    }

    @Test
    void exportaNombreHistoricoDeCuentaEliminada() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Transaccion transaccion = Transaccion.builder()
                .id(21L)
                .usuario(usuario)
                .cuenta(null)
                .cuentaNombreHistorico("Ahorro universidad")
                .cuentaMonedaHistorica("MXN")
                .tipo(TipoTransaccion.GASTO)
                .monto(new BigDecimal("25.00"))
                .fecha(LocalDate.of(2026, 9, 26))
                .descripcion("Libros")
                .build();
        when(transaccionRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(transaccion));

        String csv = transaccionService.exportarCsv(7L, null);

        assertTrue(csv.contains("\"Ahorro universidad\",\"MXN\""));
    }

    @Test
    void categoriaDebeCoincidirConTipoAntesDeActualizarSaldo() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Cuenta cuenta = cuenta(1L, usuario, "MXN", "100.00");
        Categoria gasto = Categoria.builder().id(4L).usuario(usuario).nombre("Comida")
                .tipo(TipoTransaccion.GASTO).activo(true).build();
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(cuentaRepository.findByIdAndUsuarioId(1L, 7L)).thenReturn(Optional.of(cuenta));
        when(categoriaRepository.findAccessibleById(4L, 7L)).thenReturn(Optional.of(gasto));

        assertThrows(IllegalArgumentException.class, () -> transaccionService.crearTransaccion(
                7L, new TransaccionRequest(
                        1L, null, 4L, TipoTransaccion.INGRESO, new BigDecimal("10.00"),
                        null, LocalDate.now(), "Ingreso incompatible", null, null, null
                )
        ));

        assertEquals(new BigDecimal("100.00"), cuenta.getSaldoActual());
        verify(cuentaRepository, never()).save(any(Cuenta.class));
    }

    @Test
    void crearGastoRecurrenteGuardaCategoriaComoConceptoYGeneraPlantilla() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Cuenta cuenta = cuenta(1L, usuario, "MXN", "100.00");
        Categoria categoria = Categoria.builder().id(4L).usuario(usuario).nombre("Renta")
                .tipo(TipoTransaccion.GASTO).activo(true).build();
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(cuentaRepository.findByIdAndUsuarioId(1L, 7L)).thenReturn(Optional.of(cuenta));
        when(categoriaRepository.findAccessibleById(4L, 7L)).thenReturn(Optional.of(categoria));
        when(transaccionRepository.save(any(Transaccion.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(plantillaRepository.save(any(PlantillaRecurrente.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = transaccionService.crearTransaccion(7L, new TransaccionRequest(
                1L, null, 4L, TipoTransaccion.GASTO, new BigDecimal("15.00"),
                null, LocalDate.of(2026, 9, 26), null, "Pago mensual",
                FrecuenciaRecurrencia.MENSUAL, LocalDate.of(2026, 10, 26)
        ));

        assertEquals("Renta", response.descripcion());
        assertEquals("Pago mensual", response.notas());
        assertEquals(new BigDecimal("85.00"), cuenta.getSaldoActual());
        verify(plantillaRepository).save(any(PlantillaRecurrente.class));
    }

    @Test
    void crearGastoRegistraCashbackVinculadoYRespetaLimiteMensual() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Cuenta cuenta = cuenta(1L, usuario, "MXN", "100.00");
        cuenta.setCashbackPorcentaje(new BigDecimal("2.00"));
        cuenta.setCashbackLimiteMensual(new BigDecimal("1.00"));
        List<Transaccion> gastosDelMes = new ArrayList<>();
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(cuentaRepository.findByIdAndUsuarioId(1L, 7L)).thenReturn(Optional.of(cuenta));
        when(transaccionRepository.save(any(Transaccion.class))).thenAnswer(invocation -> {
            Transaccion guardada = invocation.getArgument(0);
            guardada.setId(guardada.getCashbackOrigen() == null ? 11L : 12L);
            if (guardada.getCashbackOrigen() == null) gastosDelMes.add(guardada);
            return guardada;
        });
        when(transaccionRepository.findByCuentaIdAndTipoAndFechaBetweenOrderByFechaAscIdAsc(
                1L, TipoTransaccion.GASTO, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30)
        )).thenReturn(gastosDelMes);
        when(transaccionRepository.findByCuentaIdAndCashbackOrigenIsNotNullAndFechaBetweenOrderByFechaAscIdAsc(
                1L, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30)
        )).thenReturn(List.of());

        var response = transaccionService.crearTransaccion(7L, new TransaccionRequest(
                1L, null, null, TipoTransaccion.GASTO, new BigDecimal("80.00"),
                null, LocalDate.of(2026, 9, 26), null, "Compra", null, null
        ));

        assertEquals(new BigDecimal("21.00"), cuenta.getSaldoActual());
        assertEquals(11L, response.id());
        org.mockito.ArgumentCaptor<Transaccion> captor = org.mockito.ArgumentCaptor.forClass(Transaccion.class);
        verify(transaccionRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        Transaccion cashback = captor.getAllValues().get(1);
        assertEquals(TipoTransaccion.INGRESO, cashback.getTipo());
        assertEquals(new BigDecimal("1.00"), cashback.getMonto());
        assertEquals(11L, cashback.getCashbackOrigen().getId());
        assertEquals("Cashback · Gasto sin categoría", cashback.getDescripcion());
    }

    @Test
    void gastoEnTarjetaDeCreditoReduceSaldoYNoExcedeDisponible() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Cuenta tarjeta = cuenta(1L, usuario, "MXN", "0.00");
        tarjeta.setTipo(TipoCuenta.CREDITO);
        tarjeta.setLimiteCredito(new BigDecimal("1000.00"));
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(cuentaRepository.findByIdAndUsuarioId(1L, 7L)).thenReturn(Optional.of(tarjeta));
        when(transaccionRepository.save(any(Transaccion.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        transaccionService.crearTransaccion(7L, new TransaccionRequest(
                1L, null, null, TipoTransaccion.GASTO, new BigDecimal("750.00"),
                null, LocalDate.now(), "Compra", null, null, null
        ));

        assertEquals(new BigDecimal("-750.00"), tarjeta.getSaldoActual());
    }

    @Test
    void ingresosYGastosAjustanSaldosDeDebitoAhorroEInversion() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Cuenta debito = cuenta(1L, usuario, "MXN", "100.00");
        Cuenta ahorro = cuenta(2L, usuario, "MXN", "200.00");
        ahorro.setTipo(TipoCuenta.AHORRO);
        Cuenta inversion = cuenta(3L, usuario, "MXN", "300.00");
        inversion.setTipo(TipoCuenta.INVERSION);
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(cuentaRepository.findByIdAndUsuarioId(1L, 7L)).thenReturn(Optional.of(debito));
        when(cuentaRepository.findByIdAndUsuarioId(2L, 7L)).thenReturn(Optional.of(ahorro));
        when(cuentaRepository.findByIdAndUsuarioId(3L, 7L)).thenReturn(Optional.of(inversion));
        when(transaccionRepository.save(any(Transaccion.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        transaccionService.crearTransaccion(7L, new TransaccionRequest(
                1L, null, null, TipoTransaccion.GASTO, new BigDecimal("25.00"),
                null, LocalDate.now(), "Gasto débito", null, null, null
        ));
        transaccionService.crearTransaccion(7L, new TransaccionRequest(
                1L, null, null, TipoTransaccion.INGRESO, new BigDecimal("50.00"),
                null, LocalDate.now(), "Ingreso débito", null, null, null
        ));
        transaccionService.crearTransaccion(7L, new TransaccionRequest(
                2L, null, null, TipoTransaccion.GASTO, new BigDecimal("30.00"),
                null, LocalDate.now(), "Gasto ahorro", null, null, null
        ));
        transaccionService.crearTransaccion(7L, new TransaccionRequest(
                2L, null, null, TipoTransaccion.INGRESO, new BigDecimal("20.00"),
                null, LocalDate.now(), "Ingreso ahorro", null, null, null
        ));
        transaccionService.crearTransaccion(7L, new TransaccionRequest(
                3L, null, null, TipoTransaccion.GASTO, new BigDecimal("100.00"),
                null, LocalDate.now(), "Gasto inversión", null, null, null
        ));
        transaccionService.crearTransaccion(7L, new TransaccionRequest(
                3L, null, null, TipoTransaccion.INGRESO, new BigDecimal("75.00"),
                null, LocalDate.now(), "Ingreso inversión", null, null, null
        ));

        assertEquals(new BigDecimal("125.00"), debito.getSaldoActual());
        assertEquals(new BigDecimal("190.00"), ahorro.getSaldoActual());
        assertEquals(new BigDecimal("275.00"), inversion.getSaldoActual());
        verify(cuentaRepository, org.mockito.Mockito.atLeast(6)).save(any(Cuenta.class));
    }

    @Test
    void ingresoEnTarjetaReduceLaDeudaDespuesDeUnGasto() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Cuenta tarjeta = cuenta(1L, usuario, "MXN", "-250.00");
        tarjeta.setTipo(TipoCuenta.CREDITO);
        tarjeta.setLimiteCredito(new BigDecimal("1000.00"));
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(cuentaRepository.findByIdAndUsuarioId(1L, 7L)).thenReturn(Optional.of(tarjeta));
        when(transaccionRepository.save(any(Transaccion.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        transaccionService.crearTransaccion(7L, new TransaccionRequest(
                1L, null, null, TipoTransaccion.GASTO, new BigDecimal("400.00"),
                null, LocalDate.now(), "Compra", null, null, null
        ));
        assertEquals(new BigDecimal("-650.00"), tarjeta.getSaldoActual());

        transaccionService.crearTransaccion(7L, new TransaccionRequest(
                1L, null, null, TipoTransaccion.INGRESO, new BigDecimal("250.00"),
                null, LocalDate.now(), "Pago de tarjeta", null, null, null
        ));

        assertEquals(new BigDecimal("-400.00"), tarjeta.getSaldoActual());
    }

    @Test
    void gastoQueExcedeCreditoDisponibleSeRechazaAntesDeGuardar() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Cuenta tarjeta = cuenta(1L, usuario, "MXN", "-900.00");
        tarjeta.setTipo(TipoCuenta.CREDITO);
        tarjeta.setLimiteCredito(new BigDecimal("1000.00"));
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(cuentaRepository.findByIdAndUsuarioId(1L, 7L)).thenReturn(Optional.of(tarjeta));

        assertEquals("El movimiento supera el crédito disponible de la tarjeta (100.00)",
                assertThrows(IllegalArgumentException.class, () -> transaccionService.crearTransaccion(
                        7L, new TransaccionRequest(
                                1L, null, null, TipoTransaccion.GASTO, new BigDecimal("100.01"),
                                null, LocalDate.now(), "Compra", null, null, null
                        )
                )).getMessage());

        assertEquals(new BigDecimal("-900.00"), tarjeta.getSaldoActual());
        verify(transaccionRepository, never()).save(any(Transaccion.class));
        verify(cuentaRepository, never()).save(any(Cuenta.class));
    }

    @Test
    void editarGastoValidaDisponibleTrasRevertirElGastoAnterior() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Cuenta tarjeta = cuenta(1L, usuario, "MXN", "-900.00");
        tarjeta.setTipo(TipoCuenta.CREDITO);
        tarjeta.setLimiteCredito(new BigDecimal("1000.00"));
        Transaccion gasto = Transaccion.builder()
                .id(15L).usuario(usuario).cuenta(tarjeta)
                .tipo(TipoTransaccion.GASTO).monto(new BigDecimal("900.00"))
                .fecha(LocalDate.now()).descripcion("Compra original").build();
        when(transaccionRepository.findByIdAndUsuarioId(15L, 7L)).thenReturn(Optional.of(gasto));
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(cuentaRepository.findByIdAndUsuarioId(1L, 7L)).thenReturn(Optional.of(tarjeta));

        assertThrows(IllegalArgumentException.class, () -> transaccionService.actualizarTransaccion(
                7L, 15L, new TransaccionRequest(
                        1L, null, null, TipoTransaccion.GASTO, new BigDecimal("1000.01"),
                        null, LocalDate.now(), "Compra corregida", null, null, null
                )
        ));

        assertEquals(new BigDecimal("-900.00"), tarjeta.getSaldoActual());
        verify(transaccionRepository, never()).save(any(Transaccion.class));
        verify(cuentaRepository, never()).save(any(Cuenta.class));
    }

    @Test
    void exportarCsvEscapaCeldasYNeutralizaFormulas() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Cuenta cuenta = cuenta(1L, usuario, "MXN", "100.00");
        cuenta.setNombre("Cuenta, \"Principal\"");
        Categoria categoria = Categoria.builder().id(4L).usuario(usuario).nombre("Comida").build();
        Transaccion transaccion = Transaccion.builder()
                .id(9L)
                .usuario(usuario)
                .cuenta(cuenta)
                .categoria(categoria)
                .tipo(TipoTransaccion.GASTO)
                .monto(new BigDecimal("15.00"))
                .fecha(LocalDate.of(2026, 9, 26))
                .descripcion("=HYPERLINK(\"https://example.test\",\"abrir\")")
                .notas("Primera línea,\nsegunda línea")
                .build();
        when(transaccionRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(transaccion));

        String csv = transaccionService.exportarCsv(7L, null);

        assertTrue(csv.startsWith("\uFEFFID,Fecha,Tipo,Descripción"));
        assertTrue(csv.contains("\"'=HYPERLINK(\"\"https://example.test\"\",\"\"abrir\"\")\""));
        assertTrue(csv.contains("\"Cuenta, \"\"Principal\"\"\""));
        assertTrue(csv.contains("\"Primera línea,\nsegunda línea\""));
    }

    @Test
    void exportarCsvRechazaRangoDeFechasInvertido() {
        var filtro = new TransaccionFiltroRequest(
                null, null, null, LocalDate.of(2026, 9, 27), LocalDate.of(2026, 9, 26), null
        );

        assertThrows(IllegalArgumentException.class, () -> transaccionService.exportarCsv(7L, filtro));

        verify(transaccionRepository, never()).findAll(any(Specification.class), any(Sort.class));
    }

    private Cuenta cuenta(Long id, Usuario usuario, String moneda, String saldo) {
        return Cuenta.builder()
                .id(id)
                .usuario(usuario)
                .nombre("Cuenta " + id)
                .tipo(TipoCuenta.DEBITO)
                .moneda(moneda)
                .saldoActual(new BigDecimal(saldo))
                .activo(true)
                .build();
    }
}
