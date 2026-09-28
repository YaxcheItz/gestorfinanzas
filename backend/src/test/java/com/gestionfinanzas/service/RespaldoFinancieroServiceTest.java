package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.response.PerfilResponse;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
import com.gestionfinanzas.repository.PresupuestoRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RespaldoFinancieroServiceTest {

    private final PerfilService perfilService = mock(PerfilService.class);
    private final CuentaRepository cuentaRepository = mock(CuentaRepository.class);
    private final CategoriaRepository categoriaRepository = mock(CategoriaRepository.class);
    private final PresupuestoRepository presupuestoRepository = mock(PresupuestoRepository.class);
    private final PlantillaRecurrenteRepository plantillaRepository = mock(PlantillaRecurrenteRepository.class);
    private final TransaccionRepository transaccionRepository = mock(TransaccionRepository.class);
    private final AuditoriaTransaccionService auditoriaService = mock(AuditoriaTransaccionService.class);
    private final RespaldoFinancieroService respaldoService = new RespaldoFinancieroService(
            perfilService,
            cuentaRepository,
            categoriaRepository,
            presupuestoRepository,
            plantillaRepository,
            transaccionRepository,
            auditoriaService
    );

    @Test
    void generaUnRespaldoVersionadoSoloParaElUsuarioSolicitado() {
        when(perfilService.obtener(42L)).thenReturn(new PerfilResponse(42L, "Ana", "ana@example.com", "CLARO", "MXN"));

        var respaldo = respaldoService.generar(42L);

        assertEquals(1, respaldo.version());
        assertEquals(42L, respaldo.perfil().id());
        assertEquals("ana@example.com", respaldo.perfil().email());
        assertEquals(0, respaldo.cuentas().size());
        assertEquals(0, respaldo.transacciones().size());
        verify(cuentaRepository).findByUsuarioIdOrderByActivoDescNombreAsc(42L);
        verify(categoriaRepository).findByUsuarioIdOrderByActivoDescNombreAsc(42L);
        verify(presupuestoRepository).findAllByUsuarioIdOrderByAnioDescMesDescIdAsc(42L);
        verify(plantillaRepository).findAllByUsuarioIdOrderBySiguienteFechaAsc(42L);
        verify(transaccionRepository).findAll(any(Specification.class), any(Sort.class));
    }
}
