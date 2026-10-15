package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.TransaccionRequest;
import com.gestionfinanzas.dto.response.PlantillaRecurrenteResponse;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.PlantillaRecurrente;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.FrecuenciaRecurrencia;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class PlantillaRecurrenteServiceTest {

    private final PlantillaRecurrenteRepository plantillaRepository = mock(PlantillaRecurrenteRepository.class);
    private final TransaccionService transaccionService = mock(TransaccionService.class);
    private final com.gestionfinanzas.repository.TransaccionRepository transaccionRepository =
            mock(com.gestionfinanzas.repository.TransaccionRepository.class);
    private final PlantillaRecurrenteService service = new PlantillaRecurrenteService(
            plantillaRepository, transaccionService, transaccionRepository
    );

    @Test
    void registrarSiguienteVinculaPlantillaYFinalizaAlAlcanzarFechaFin() {
        Usuario usuario = Usuario.builder().id(3L).build();
        Cuenta cuenta = Cuenta.builder().id(11L).usuario(usuario).tipo(TipoCuenta.DEBITO).moneda("MXN").build();
        LocalDate hoy = CalendarioFinanciero.hoy();
        LocalDate inicio = hoy.minusWeeks(2);
        LocalDate fechaFin = hoy.minusDays(3);

        PlantillaRecurrente plantilla = PlantillaRecurrente.builder()
                .id(99L)
                .usuario(usuario)
                .cuenta(cuenta)
                .tipo(TipoTransaccion.GASTO)
                .monto(new BigDecimal("150.00"))
                .frecuencia(FrecuenciaRecurrencia.SEMANAL)
                .siguienteFecha(inicio)
                .fechaAncla(inicio)
                .fechaFin(fechaFin)
                .activa(true)
                .build();

        when(plantillaRepository.findByIdAndUsuarioId(99L, 3L)).thenReturn(Optional.of(plantilla));
        when(plantillaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Primera ejecución: vence en inicio (hoy - 14 días), avanza a inicio + 7 días (hoy - 7 días <= fechaFin), sigue activa
        service.registrarSiguiente(3L, 99L);

        ArgumentCaptor<TransaccionRequest> requestCaptor = ArgumentCaptor.forClass(TransaccionRequest.class);
        verify(transaccionService).crearCuotaRecurrente(eq(3L), requestCaptor.capture(), eq(null), eq(99L));
        assertEquals(new BigDecimal("150.00"), requestCaptor.getValue().monto());

        assertEquals(inicio.plusWeeks(1), plantilla.getSiguienteFecha());
        assertTrue(plantilla.isActiva());

        // Segunda ejecución: vence en inicio + 7 días (hoy - 7 días), la siguiente calculada es hoy (> fechaFin hoy - 3 días), se desactiva
        reset(transaccionService);
        service.registrarSiguiente(3L, 99L);
        verify(transaccionService).crearCuotaRecurrente(eq(3L), any(), eq(null), eq(99L));
        assertEquals(hoy, plantilla.getSiguienteFecha());
        assertFalse(plantilla.isActiva(), "Debe marcarse inactiva porque la siguiente fecha calculada supera fechaFin");
    }

    @Test
    void mesesCortosConservanDiaAnclaFinDeMes() {
        LocalDate ancla = LocalDate.of(2026, 1, 31);
        // De enero 31 a febrero: año no bisiesto 2026 tiene 28 días
        LocalDate feb = CalendarioFinanciero.siguiente(ancla, FrecuenciaRecurrencia.MENSUAL, ancla);
        assertEquals(LocalDate.of(2026, 2, 28), feb);

        // De febrero 28 a marzo con ancla en el 31: debe volver al día 31 de marzo
        LocalDate mar = CalendarioFinanciero.siguiente(feb, FrecuenciaRecurrencia.MENSUAL, ancla);
        assertEquals(LocalDate.of(2026, 3, 31), mar);

        // De marzo 31 a abril: tiene 30 días
        LocalDate abr = CalendarioFinanciero.siguiente(mar, FrecuenciaRecurrencia.MENSUAL, ancla);
        assertEquals(LocalDate.of(2026, 4, 30), abr);
    }

    @Test
    void actualizarFechaFinDesactivaSiSiguienteFechaLaSupera() {
        Usuario usuario = Usuario.builder().id(3L).build();
        PlantillaRecurrente plantilla = PlantillaRecurrente.builder()
                .id(15L)
                .usuario(usuario)
                .cuenta(Cuenta.builder().id(1L).moneda("MXN").build())
                .tipo(TipoTransaccion.GASTO)
                .monto(new BigDecimal("100.00"))
                .frecuencia(FrecuenciaRecurrencia.MENSUAL)
                .siguienteFecha(LocalDate.of(2026, 11, 15))
                .activa(true)
                .build();

        when(plantillaRepository.findByIdAndUsuarioId(15L, 3L)).thenReturn(Optional.of(plantilla));
        when(plantillaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Establecer fecha fin anterior a la siguiente fecha
        PlantillaRecurrenteResponse resp = service.actualizarFechaFin(3L, 15L, LocalDate.of(2026, 11, 1));
        assertFalse(resp.activa());
        assertEquals(LocalDate.of(2026, 11, 1), resp.fechaFin());
    }
}
