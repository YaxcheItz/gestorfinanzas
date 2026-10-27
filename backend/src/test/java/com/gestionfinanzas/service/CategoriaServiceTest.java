package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.CategoriaRequest;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.PresupuestoRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CategoriaServiceTest {

    private final CategoriaRepository categoriaRepository = mock(CategoriaRepository.class);
    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final TransaccionRepository transaccionRepository = mock(TransaccionRepository.class);
    private final PresupuestoRepository presupuestoRepository = mock(PresupuestoRepository.class);
    private final CategoriaService service = new CategoriaService(
            categoriaRepository, usuarioRepository, transaccionRepository, presupuestoRepository
    );
    @Test
    void noDuplicaCategoriaCreadaPorUnAvisoMientrasLaCreacionManualEspera() {
        var usuario=Usuario.builder().id(7L).build();
        var reciboTermino=new java.util.concurrent.atomic.AtomicBoolean();
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(usuarioRepository.findByIdForUpdate(7L)).thenAnswer(call->{reciboTermino.set(true);return Optional.of(usuario);});
        when(categoriaRepository.existsByUsuarioIdAndTipoAndNombreIgnoreCase(7L,TipoTransaccion.GASTO,"Otros gastos"))
            .thenAnswer(call->reciboTermino.get());
        when(categoriaRepository.save(any(Categoria.class))).thenAnswer(call->{Categoria c=call.getArgument(0);c.setId(4L);return c;});
        assertThrows(IllegalArgumentException.class,()->service.crearCategoria(7L,
            new CategoriaRequest("Otros gastos",TipoTransaccion.GASTO,"receipt","#64748b")));
        org.mockito.Mockito.verify(categoriaRepository,org.mockito.Mockito.never()).save(any());
    }

    @Test
    void rechazaNombresMayoresA20AlCrear() {
        CategoriaRequest request = new CategoriaRequest(
                "Nombre de categoría largo", TipoTransaccion.GASTO, "receipt", "#123456"
        );

        assertThrows(IllegalArgumentException.class, () -> service.crearCategoria(7L, request));
    }

    @Test
    void permiteConservarElNombreDeUnaCategoriaExistenteMasLargoAlEditarIcono() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Categoria categoria = Categoria.builder()
                .id(4L).usuario(usuario).nombre("Alimentos y Supermercado").tipo(TipoTransaccion.GASTO).build();
        when(categoriaRepository.findByIdAndUsuarioId(4L, 7L)).thenReturn(Optional.of(categoria));
        when(categoriaRepository.save(any(Categoria.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.actualizarCategoria(7L, 4L, new CategoriaRequest(
                "Alimentos y Supermercado", TipoTransaccion.GASTO, "shopping-basket", "#123456"
        ));

        assertEquals("Alimentos y Supermercado", response.nombre());
        assertEquals("shopping-basket", response.icono());
        verify(categoriaRepository).save(categoria);
    }

    @Test
    void rechazaCambiarUnNombreExistentePorOtroNombreMayorA20() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Categoria categoria = Categoria.builder()
                .id(4L).usuario(usuario).nombre("Transporte").tipo(TipoTransaccion.GASTO).build();
        when(categoriaRepository.findByIdAndUsuarioId(4L, 7L)).thenReturn(Optional.of(categoria));
        when(categoriaRepository.save(any(Categoria.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertThrows(IllegalArgumentException.class, () -> service.actualizarCategoria(7L, 4L, new CategoriaRequest(
                "Nombre de categoría largo", TipoTransaccion.GASTO, "car", "#123456"
        )));
    }
}
