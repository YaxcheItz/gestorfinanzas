package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.PresupuestoRequest;
import com.gestionfinanzas.dto.response.PresupuestoDetalleResponse;
import com.gestionfinanzas.dto.response.PresupuestoDisponibleResponse;
import com.gestionfinanzas.dto.response.PresupuestoResponse;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.ListaFinanciera;
import com.gestionfinanzas.model.entity.Presupuesto;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.PresupuestoRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class PresupuestoServiceTest {

    private final PresupuestoRepository presupuestoRepository = mock(PresupuestoRepository.class);
    private final CategoriaRepository categoriaRepository = mock(CategoriaRepository.class);
    private final TransaccionRepository transaccionRepository = mock(TransaccionRepository.class);
    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final ListaService listaService = mock(ListaService.class);
    private final PresupuestoService presupuestoService = new PresupuestoService(
            presupuestoRepository, categoriaRepository, transaccionRepository, usuarioRepository, listaService
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

    @Test
    void guardaPresupuestoConUmbralDeAlertaYLista() {
        Usuario usuario = Usuario.builder().id(7L).build();
        ListaFinanciera lista = ListaFinanciera.builder().id(10L).nombre("Casa").build();
        Categoria gasto = Categoria.builder().id(5L).usuario(usuario).nombre("Comida")
                .tipo(TipoTransaccion.GASTO).activo(true).build();

        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(listaService.escribir(7L, 10L)).thenReturn(lista);
        when(presupuestoRepository.findByUsuarioIdAndCategoriaIdAndMesAndAnioAndListaId(7L, 5L, 10, 2026, 10L))
                .thenReturn(Optional.empty());
        when(categoriaRepository.findAccessibleById(5L, 7L)).thenReturn(Optional.of(gasto));
        when(presupuestoRepository.save(any())).thenAnswer(inv -> {
            Presupuesto p = inv.getArgument(0);
            p.setId(100L);
            return p;
        });

        PresupuestoRequest request = new PresupuestoRequest(
                5L, new BigDecimal("5000.00"), "MXN", 10, 2026, 10L, 75
        );
        PresupuestoResponse response = presupuestoService.crearOActualizarPresupuesto(7L, request);

        assertNotNull(response);
        assertEquals(75, response.porcentajeAlerta());
        assertEquals(10L, response.listaId());
        assertEquals("Casa", response.listaNombre());
        assertEquals("NORMAL", response.estado());
    }

    @Test
    void calculaDisponibleCategoriaYDetectaAlertaConUmbralConfigurado() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Categoria gasto = Categoria.builder().id(5L).usuario(usuario).nombre("Comida")
                .tipo(TipoTransaccion.GASTO).icono("🍔").activo(true).build();
        Presupuesto presupuesto = Presupuesto.builder()
                .id(1L)
                .usuario(usuario)
                .categoria(gasto)
                .montoLimite(new BigDecimal("1000.00"))
                .moneda("MXN")
                .porcentajeAlerta(70)
                .mes(10)
                .anio(2026)
                .build();

        when(categoriaRepository.findAccessibleById(5L, 7L)).thenReturn(Optional.of(gasto));
        when(presupuestoRepository.findCandidatosParaDisponible(eq(7L), eq(5L), eq(null), eq(10), eq(2026)))
                .thenReturn(List.of(presupuesto));
        when(transaccionRepository.sumGastosPorUsuarioYCategoriaYListaYPeriodo(
                eq(7L), eq(5L), eq(null), eq("MXN"), any(), any()
        )).thenReturn(new BigDecimal("750.00")); // 75% gastado -> supera umbral del 70%

        PresupuestoDisponibleResponse disponible = presupuestoService.obtenerDisponibleCategoria(
                7L, 5L, null, LocalDate.of(2026, 10, 15), "MXN"
        );

        assertTrue(disponible.tienePresupuesto());
        assertEquals(new BigDecimal("1000.00"), disponible.montoLimite());
        assertEquals(new BigDecimal("750.00"), disponible.montoGastado());
        assertEquals(new BigDecimal("250.00"), disponible.montoDisponible());
        assertEquals(new BigDecimal("75.00"), disponible.porcentajeConsumido());
        assertEquals(70, disponible.porcentajeAlerta());
        assertEquals("ALERTA", disponible.estado());
    }

    @Test
    void obtenerDetalleRetornaPresupuestoYMovimientos() {
        Usuario usuario = Usuario.builder().id(7L).build();
        Categoria gasto = Categoria.builder().id(5L).usuario(usuario).nombre("Comida")
                .tipo(TipoTransaccion.GASTO).activo(true).build();
        Presupuesto presupuesto = Presupuesto.builder()
                .id(1L)
                .usuario(usuario)
                .categoria(gasto)
                .montoLimite(new BigDecimal("2000.00"))
                .moneda("MXN")
                .porcentajeAlerta(80)
                .mes(10)
                .anio(2026)
                .build();

        Transaccion t1 = Transaccion.builder()
                .id(20L)
                .usuario(usuario)
                .categoria(gasto)
                .tipo(TipoTransaccion.GASTO)
                .monto(new BigDecimal("300.00"))
                .fecha(LocalDate.of(2026, 10, 5))
                .descripcion("Supermercado")
                .cuentaNombreHistorico("Efectivo")
                .cuentaMonedaHistorica("MXN")
                .build();

        when(presupuestoRepository.findByIdAndUsuarioId(1L, 7L)).thenReturn(Optional.of(presupuesto));
        when(transaccionRepository.sumGastosPorUsuarioYCategoriaYListaYPeriodo(
                eq(7L), eq(5L), eq(null), eq("MXN"), any(), any()
        )).thenReturn(new BigDecimal("300.00"));
        when(transaccionRepository.findTransaccionesPresupuesto(
                eq(7L), eq(5L), eq(null), eq("MXN"), any(), any()
        )).thenReturn(List.of(t1));

        PresupuestoDetalleResponse detalle = presupuestoService.obtenerDetalle(7L, 1L);

        assertNotNull(detalle);
        assertEquals(1L, detalle.presupuesto().id());
        assertEquals(new BigDecimal("300.00"), detalle.presupuesto().montoGastado());
        assertEquals(new BigDecimal("1700.00"), detalle.presupuesto().montoDisponible());
        assertEquals(1, detalle.movimientos().size());
        assertEquals("Supermercado", detalle.movimientos().get(0).descripcion());
    }
}
