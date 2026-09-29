package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.PresupuestoRequest;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.PresupuestoRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PresupuestoServiceTest {

    private final PresupuestoRepository presupuestoRepository = mock(PresupuestoRepository.class);
    private final CategoriaRepository categoriaRepository = mock(CategoriaRepository.class);
    private final TransaccionRepository transaccionRepository = mock(TransaccionRepository.class);
    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final PresupuestoService presupuestoService = new PresupuestoService(
            presupuestoRepository, categoriaRepository, transaccionRepository, usuarioRepository
    );

    @Test
    void soloPermiteAsignarPresupuestosACategoriasDeGasto() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Categoria ingreso = Categoria.builder().id(4L).usuario(usuario).nombre("Salario")
                .tipo(TipoTransaccion.INGRESO).activo(true).build();
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(presupuestoRepository.findByUsuarioIdAndCategoriaIdAndMesAndAnio(7L, 4L, 9, 2026))
                .thenReturn(Optional.empty());
        when(categoriaRepository.findAccessibleById(4L, 7L)).thenReturn(Optional.of(ingreso));

        assertThrows(IllegalArgumentException.class, () -> presupuestoService.crearOActualizarPresupuesto(
                7L, new PresupuestoRequest(4L, new BigDecimal("100.00"), "MXN", 9, 2026)
        ));

        verify(presupuestoRepository, never()).save(any());
    }
}
