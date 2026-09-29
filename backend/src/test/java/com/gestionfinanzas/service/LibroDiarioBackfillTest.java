package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.response.BackfillLibroDiarioResponse;
import com.gestionfinanzas.model.entity.AsientoContable;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.AsientoContableRepository;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LibroDiarioBackfillTest {

    private final AsientoContableRepository asientos = mock(AsientoContableRepository.class);
    private final TransaccionRepository transacciones = mock(TransaccionRepository.class);
    private final CuentaRepository cuentas = mock(CuentaRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final LibroDiarioService servicio = new LibroDiarioService(asientos, transacciones, cuentas, usuarios);
    private final List<AsientoContable> guardados = new ArrayList<>();
    private final List<Transaccion> movimientos = new ArrayList<>();
    private Cuenta cuenta;

    @BeforeEach
    void prepararCopiaAislada() {
        guardados.clear();
        movimientos.clear();
        cuenta = Cuenta.builder()
                .id(9L).nombre("Cuenta de prueba").tipo(TipoCuenta.DEBITO).moneda("MXN")
                .saldoActual(new BigDecimal("-101.00")).activo(true).build();
        for (long id = 1; id <= 101; id++) {
            movimientos.add(Transaccion.builder()
                    .id(id).cuenta(cuenta).tipo(TipoTransaccion.GASTO)
                    .monto(BigDecimal.ONE).fecha(LocalDate.of(2024, 1, 1).plusDays(id))
                    .descripcion("Gasto histórico " + id).build());
        }

        when(transacciones.findAllByUsuarioIdOrderByFechaAscIdAsc(42L)).thenReturn(movimientos);
        when(transacciones.findByIdAndUsuarioIdForUpdate(anyLong(), eq(42L))).thenAnswer(call ->
                movimientos.stream().filter(m -> m.getId().equals(call.getArgument(0))).findFirst());
        when(usuarios.getReferenceById(42L)).thenReturn(Usuario.builder().id(42L).build());
        when(cuentas.findByUsuarioIdOrderByActivoDescNombreAsc(42L)).thenReturn(List.of(cuenta));
        when(asientos.save(any(AsientoContable.class))).thenAnswer(call -> {
            AsientoContable asiento = call.getArgument(0);
            guardados.add(asiento);
            return asiento;
        });
        when(asientos.existsByUsuarioIdAndTransaccionOrigenId(eq(42L), anyLong())).thenAnswer(call ->
                guardados.stream().anyMatch(a -> a.getTransaccionOrigenId().equals(call.getArgument(1))));
        when(asientos.findTransaccionesContabilizadas(42L)).thenAnswer(call -> guardados.stream()
                .map(AsientoContable::getTransaccionOrigenId).collect(Collectors.toSet()));
        when(asientos.findAllByUsuarioIdOrderByFechaOperacionAscIdAsc(42L)).thenAnswer(call -> List.copyOf(guardados));
    }

    @Test
    void procesaPorLotesSinCambiarSaldosOperativosYCompletaEnLaSiguienteEjecucion() {
        BackfillLibroDiarioResponse primerLote = servicio.ejecutarBackfill(42L);

        assertEquals(100, primerLote.procesados());
        assertEquals(1, primerLote.pendientesDespues());
        assertEquals(100, guardados.size());
        assertEquals(0, cuenta.getSaldoActual().compareTo(new BigDecimal("-101.00")));
        assertEquals(TipoTransaccion.GASTO, guardados.getFirst().getTipoMovimiento());
        assertEquals("BACKFILL", guardados.getFirst().getTipoEvento());
        verify(cuentas, never()).save(any(Cuenta.class));

        BackfillLibroDiarioResponse segundoLote = servicio.ejecutarBackfill(42L);
        assertEquals(1, segundoLote.procesados());
        assertEquals(0, segundoLote.pendientesDespues());
        assertEquals(101, guardados.size());

        BackfillLibroDiarioResponse repetido = servicio.ejecutarBackfill(42L);
        assertEquals(0, repetido.procesados());
        assertEquals(0, repetido.pendientes());
        assertEquals(101, guardados.size());
    }

    @Test
    void proyectaLaDiferenciaPorCuentaSinGenerarUnAjusteAutomatico() {
        cuenta.setSaldoActual(new BigDecimal("-100.00"));
        BackfillLibroDiarioResponse vistaPrevia = servicio.previsualizarBackfill(42L);

        assertEquals(0, vistaPrevia.conciliacionCuentas().getFirst().saldoOperativo().compareTo(new BigDecimal("-100.00")));
        assertEquals(0, vistaPrevia.conciliacionCuentas().getFirst().saldoLibroProyectado().compareTo(new BigDecimal("-101.00")));
        assertEquals(0, vistaPrevia.conciliacionCuentas().getFirst().diferencia().compareTo(new BigDecimal("-1.00")));
        assertEquals(0, guardados.size());
        assertEquals(0, cuenta.getSaldoActual().compareTo(new BigDecimal("-100.00")));
        verify(asientos, never()).save(any(AsientoContable.class));
    }
}
