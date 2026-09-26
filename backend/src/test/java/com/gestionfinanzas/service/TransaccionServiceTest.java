package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.TransaccionRequest;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
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
