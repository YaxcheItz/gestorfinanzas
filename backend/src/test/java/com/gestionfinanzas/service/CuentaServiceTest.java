package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.CuentaRequest;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CuentaServiceTest {

    private final CuentaRepository cuentaRepository = mock(CuentaRepository.class);
    private final TransaccionRepository transaccionRepository = mock(TransaccionRepository.class);
    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final CuentaService cuentaService = new CuentaService(
            cuentaRepository, usuarioRepository, transaccionRepository
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
                "Ahorro", TipoCuenta.AHORRO, new BigDecimal("1250.00"), "MXN", null
        ));

        ArgumentCaptor<Transaccion> captor = ArgumentCaptor.forClass(Transaccion.class);
        verify(transaccionRepository).save(captor.capture());
        assertEquals(TipoTransaccion.SALDO_INICIAL, captor.getValue().getTipo());
        assertEquals(new BigDecimal("1250.00"), captor.getValue().getMonto());
        assertEquals(3L, captor.getValue().getCuenta().getId());
        assertEquals(usuario, captor.getValue().getUsuario());
    }
}
