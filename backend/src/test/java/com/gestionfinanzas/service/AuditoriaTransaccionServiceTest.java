package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestionfinanzas.dto.response.TransaccionResponse;
import com.gestionfinanzas.model.entity.AuditoriaTransaccion;
import com.gestionfinanzas.repository.AuditoriaTransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class AuditoriaTransaccionServiceTest {

    private final AuditoriaTransaccionRepository auditoriaRepository = mock(AuditoriaTransaccionRepository.class);
    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final AuditoriaTransaccionService auditoriaService = new AuditoriaTransaccionService(
            auditoriaRepository, usuarioRepository, new ObjectMapper().findAndRegisterModules()
    );

    @Test
    void registraSnapshotsFinancierosSinIncluirCredenciales() {
        TransaccionResponse movimiento = new TransaccionResponse(
                5L, 2L, "Efectivo", null, null, 3L, "Comida", null, null,
                com.gestionfinanzas.model.enums.TipoTransaccion.GASTO,
                new BigDecimal("125.50"), null, null, "MXN", null, LocalDate.of(2025, 3, 2),
                "Supermercado", null, false, null
        );

        auditoriaService.registrar(42L, 5L, "CREAR", null, movimiento);

        var captor = org.mockito.ArgumentCaptor.forClass(AuditoriaTransaccion.class);
        verify(auditoriaRepository).save(captor.capture());
        String snapshot = captor.getValue().getDespuesJson();
        assertTrue(snapshot.contains("\"descripcion\":\"Supermercado\""));
        assertTrue(snapshot.contains("\"monto\":125.50"));
        assertFalse(snapshot.contains("password"));
        verify(usuarioRepository).getReferenceById(42L);
    }

    @Test
    void conservaElAntesYDejaVacioElDespuesAlAuditarUnaEliminacion() {
        TransaccionResponse movimiento = new TransaccionResponse(
                9L, 2L, "Efectivo", null, null, null, null, null, null,
                com.gestionfinanzas.model.enums.TipoTransaccion.INGRESO,
                new BigDecimal("100.00"), null, null, "MXN", null, LocalDate.of(2025, 4, 1),
                "Pago", null, false, null
        );

        auditoriaService.registrar(42L, 9L, "ELIMINAR", movimiento, null);

        var captor = org.mockito.ArgumentCaptor.forClass(AuditoriaTransaccion.class);
        verify(auditoriaRepository).save(captor.capture());
        assertTrue(captor.getValue().getAntesJson().contains("\"descripcion\":\"Pago\""));
        assertNull(captor.getValue().getDespuesJson());
    }
}
