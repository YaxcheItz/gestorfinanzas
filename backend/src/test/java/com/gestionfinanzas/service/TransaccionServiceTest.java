package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.TransaccionRequest;
import com.gestionfinanzas.dto.request.TransaccionFiltroRequest;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TransaccionServiceTest {

    private final TransaccionRepository transaccionRepository = mock(TransaccionRepository.class);
    private final CuentaRepository cuentaRepository = mock(CuentaRepository.class);
    private final CategoriaRepository categoriaRepository = mock(CategoriaRepository.class);
    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final TransaccionService transaccionService = new TransaccionService(
            transaccionRepository, cuentaRepository, categoriaRepository, usuarioRepository
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
                new BigDecimal("17.50"), LocalDate.now(), "Transferencia", null
        ));

        assertEquals(new BigDecimal("400.00"), origen.getSaldoActual());
        assertEquals(new BigDecimal("2750.00"), destino.getSaldoActual());
        assertEquals(new BigDecimal("1750.00"), response.montoDestino());
        assertEquals(new BigDecimal("17.50"), response.tasaCambio());
        assertEquals("USD", response.moneda());
        assertEquals("MXN", response.monedaDestino());
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
                        null, LocalDate.now(), "Ingreso incompatible", null
                )
        ));

        assertEquals(new BigDecimal("100.00"), cuenta.getSaldoActual());
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
