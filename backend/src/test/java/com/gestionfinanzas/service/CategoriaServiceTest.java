package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.CategoriaRequest;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.PresupuestoRepository;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
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
    private final PlantillaRecurrenteRepository plantillas = mock(PlantillaRecurrenteRepository.class);
    private final com.gestionfinanzas.repository.LineaAsientoRepository lineas = mock(com.gestionfinanzas.repository.LineaAsientoRepository.class);
    private final com.gestionfinanzas.repository.CategoriaHistoricaRepository historicas = mock(com.gestionfinanzas.repository.CategoriaHistoricaRepository.class);
    private final CategoriaService service = new CategoriaService(
            historicas, categoriaRepository, usuarioRepository, transaccionRepository, presupuestoRepository, plantillas, lineas
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

    @Test
    void rechazaNombreDemasiadoCortoDespuesDeRecortarAlEditar() {
        Categoria categoria = Categoria.builder().id(4L).nombre("Transporte").tipo(TipoTransaccion.GASTO).build();
        when(categoriaRepository.findByIdAndUsuarioId(4L, 7L)).thenReturn(Optional.of(categoria));
        when(categoriaRepository.save(any(Categoria.class))).thenAnswer(invocation -> invocation.getArgument(0));
        assertThrows(IllegalArgumentException.class, () -> service.actualizarCategoria(7L, 4L,
                new CategoriaRequest(" A ", TipoTransaccion.GASTO, "car", "#123456")));
        org.mockito.Mockito.verify(categoriaRepository, org.mockito.Mockito.never()).save(any());
    }
    @Test void eliminaCategoriaSinReferencias() {
        var categoria=Categoria.builder().id(4L).nombre("Prueba").build();
        when(categoriaRepository.findByIdAndUsuarioId(4L,7L)).thenReturn(Optional.of(categoria));
        service.eliminarCategoria(7L,4L); verify(categoriaRepository).delete(categoria);
    }
    @Test void rechazaEliminarCategoriaConRecurrencias() {
        var categoria=Categoria.builder().id(4L).nombre("Prueba").build();
        when(categoriaRepository.findByIdAndUsuarioId(4L,7L)).thenReturn(Optional.of(categoria));
        when(plantillas.findAllByCategoriaId(4L)).thenReturn(java.util.List.of(com.gestionfinanzas.model.entity.PlantillaRecurrente.builder().activa(true).build()));
        var error=assertThrows(IllegalArgumentException.class,()->service.eliminarCategoria(7L,4L));
        org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains("Reasigna"));
        org.mockito.Mockito.verify(categoriaRepository,org.mockito.Mockito.never()).delete(any());
    }
    @Test void reasignaActivosSinAlterarPresupuestosPasados() {
        var origen=Categoria.builder().id(4L).tipo(TipoTransaccion.GASTO).build();
        var destino=Categoria.builder().id(5L).tipo(TipoTransaccion.GASTO).activo(true).build();
        var mes=java.time.YearMonth.from(CalendarioFinanciero.hoy());
        var vigente=com.gestionfinanzas.model.entity.Presupuesto.builder().categoria(origen).anio(mes.getYear()).mes(mes.getMonthValue()).build();
        var anterior=mes.minusMonths(1);
        var pasado=com.gestionfinanzas.model.entity.Presupuesto.builder().categoria(origen).anio(anterior.getYear()).mes(anterior.getMonthValue()).build();
        var recurrente=com.gestionfinanzas.model.entity.PlantillaRecurrente.builder().categoria(origen).activa(true).build();
        when(categoriaRepository.findByIdAndUsuarioId(4L,7L)).thenReturn(Optional.of(origen));
        when(categoriaRepository.findAccessibleById(5L,7L)).thenReturn(Optional.of(destino));
        when(presupuestoRepository.findAllByUsuarioIdOrderByAnioDescMesDescIdAsc(7L)).thenReturn(java.util.List.of(vigente,pasado));
        when(plantillas.findAllByUsuarioIdOrderBySiguienteFechaAsc(7L)).thenReturn(java.util.List.of(recurrente));
        var resultado=service.reasignarActivos(7L,4L,5L);
        assertEquals(1,resultado.presupuestos()); assertEquals(1,resultado.recurrencias());
        assertEquals(5L,vigente.getCategoria().getId()); assertEquals(5L,recurrente.getCategoria().getId()); assertEquals(4L,pasado.getCategoria().getId());
    }
    @Test void rechazaDestinoAjenoOMismoTipoIncorrecto() {
        var origen=Categoria.builder().id(4L).tipo(TipoTransaccion.GASTO).build();
        when(categoriaRepository.findByIdAndUsuarioId(4L,7L)).thenReturn(Optional.of(origen));
        assertThrows(IllegalArgumentException.class,()->service.reasignarActivos(7L,4L,99L));
        when(categoriaRepository.findAccessibleById(5L,7L)).thenReturn(Optional.of(Categoria.builder().id(5L).tipo(TipoTransaccion.INGRESO).build()));
        assertThrows(IllegalArgumentException.class,()->service.reasignarActivos(7L,4L,5L));
    }
    @Test void conflictoDePresupuestoNoModificaNada() {
        var origen=Categoria.builder().id(4L).tipo(TipoTransaccion.GASTO).build();
        var destino=Categoria.builder().id(5L).tipo(TipoTransaccion.GASTO).activo(true).build();
        var mes=java.time.YearMonth.from(CalendarioFinanciero.hoy());
        var presupuesto=com.gestionfinanzas.model.entity.Presupuesto.builder().categoria(origen).anio(mes.getYear()).mes(mes.getMonthValue()).build();
        when(categoriaRepository.findByIdAndUsuarioId(4L,7L)).thenReturn(Optional.of(origen));
        when(categoriaRepository.findAccessibleById(5L,7L)).thenReturn(Optional.of(destino));
        when(presupuestoRepository.findAllByUsuarioIdOrderByAnioDescMesDescIdAsc(7L)).thenReturn(java.util.List.of(presupuesto));
        when(presupuestoRepository.findByUsuarioIdAndCategoriaIdAndMesAndAnioAndListaIsNull(7L,5L,mes.getMonthValue(),mes.getYear())).thenReturn(Optional.of(presupuesto));
        assertThrows(IllegalArgumentException.class,()->service.reasignarActivos(7L,4L,5L));
        assertEquals(4L,presupuesto.getCategoria().getId());
        org.mockito.Mockito.verify(presupuestoRepository,org.mockito.Mockito.never()).saveAll(any());
        org.mockito.Mockito.verify(plantillas,org.mockito.Mockito.never()).saveAll(any());
    }
    @Test void conservaReferenciaEnLibroDiarioAlEliminarCategoria() {
        var categoria=Categoria.builder().id(4L).nombre("Prueba").build();
        when(categoriaRepository.findByIdAndUsuarioId(4L,7L)).thenReturn(Optional.of(categoria));
        when(lineas.existsByCategoriaId(4L)).thenReturn(true);
        when(historicas.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        service.eliminarCategoria(7L,4L);
        verify(historicas).saveAndFlush(any()); verify(categoriaRepository).delete(categoria);
    }
    @Test void referenciasExigenPropiedadYDevuelvenConteos() {
        when(categoriaRepository.findByIdAndUsuarioId(4L,7L)).thenReturn(Optional.of(Categoria.builder().id(4L).build()));
        when(transaccionRepository.countByCategoriaId(4L)).thenReturn(3L);
        when(lineas.countByCategoriaId(4L)).thenReturn(2L);
        var referencias=service.referencias(7L,4L);
        assertEquals(3L,referencias.movimientos()); assertEquals(2L,referencias.lineasLibro());
        assertThrows(IllegalArgumentException.class,()->service.referencias(8L,4L));
    }
}
