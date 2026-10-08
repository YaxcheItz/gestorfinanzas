package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.AportacionParejaRequest;
import com.gestionfinanzas.dto.request.GastoParejaRequest;
import com.gestionfinanzas.dto.request.PagoParejaRequest;
import com.gestionfinanzas.dto.request.ParejaCrearRequest;
import com.gestionfinanzas.dto.response.ParejaResponse;
import com.gestionfinanzas.model.entity.AportacionPareja;
import com.gestionfinanzas.model.entity.GastoPareja;
import com.gestionfinanzas.model.entity.PagoPareja;
import com.gestionfinanzas.model.entity.Pareja;
import com.gestionfinanzas.model.entity.RepartoGasto;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoReparto;
import com.gestionfinanzas.repository.AportacionParejaRepository;
import com.gestionfinanzas.repository.GastoParejaRepository;
import com.gestionfinanzas.repository.PagoParejaRepository;
import com.gestionfinanzas.repository.ParejaRepository;
import com.gestionfinanzas.repository.RepartoGastoRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * El fondo común es una pantalla de aritmética, así que lo que se prueba aquí es
 * sobre todo que las dos partes de cada gasto sumen el total exacto y que el
 * saldo signifique lo mismo que dice la interfaz.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ParejaServiceTest {

    private static final Long ANA = 1L;
    private static final Long LUIS = 2L;
    private static final Long PAREJA = 10L;
    private static final LocalDate HOY = LocalDate.of(2026, 3, 10);

    @Mock
    private ParejaRepository parejaRepository;
    @Mock
    private AportacionParejaRepository aporteRepository;
    @Mock
    private GastoParejaRepository gastoRepository;
    @Mock
    private RepartoGastoRepository repartoRepository;
    @Mock
    private PagoParejaRepository pagoRepository;
    @Mock
    private UsuarioRepository usuarioRepository;

    private ParejaService servicio;
    private Usuario ana;
    private Usuario luis;
    private Pareja pareja;

    private final List<AportacionPareja> aportes = new ArrayList<>();
    private final List<GastoPareja> gastos = new ArrayList<>();
    private final List<PagoPareja> pagos = new ArrayList<>();
    private final Map<Long, List<RepartoGasto>> repartosPorGasto = new LinkedHashMap<>();
    private long siguienteId = 100L;

    @BeforeEach
    void setUp() {
        servicio = new ParejaService(parejaRepository, aporteRepository, gastoRepository,
                repartoRepository, pagoRepository, usuarioRepository, org.mockito.Mockito.mock(jakarta.persistence.EntityManager.class));

        ana = usuario(ANA, "Ana", "ana@example.com");
        luis = usuario(LUIS, "Luis", "luis@example.com");
        pareja = Pareja.builder().id(PAREJA).usuarioA(ana).usuarioB(luis).moneda("MXN").activa(true).build();

        lenient().when(usuarioRepository.findById(ANA)).thenReturn(Optional.of(ana));
        lenient().when(usuarioRepository.findById(LUIS)).thenReturn(Optional.of(luis));
        lenient().when(usuarioRepository.findByIdForUpdate(ANA)).thenReturn(Optional.of(ana));
        lenient().when(usuarioRepository.findByIdForUpdate(LUIS)).thenReturn(Optional.of(luis));
        lenient().when(parejaRepository.findById(PAREJA)).thenReturn(Optional.of(pareja));
        lenient().when(parejaRepository.findByIdForUpdate(PAREJA)).thenReturn(Optional.of(pareja));
        var participantes=org.mockito.Mockito.mock(ParejaRepository.Participantes.class);
        lenient().when(participantes.getUsuarioAId()).thenReturn(ANA);
        lenient().when(participantes.getUsuarioBId()).thenReturn(LUIS);
        lenient().when(parejaRepository.findParticipantes(PAREJA)).thenReturn(Optional.of(participantes));
        lenient().when(parejaRepository.findIdsActivasDeUsuario(ANA)).thenAnswer(i -> parejaRepository.findActivaDeUsuario(ANA).stream().map(Pareja::getId).toList());
        lenient().when(parejaRepository.findIdsActivasDeUsuario(LUIS)).thenAnswer(i -> parejaRepository.findActivaDeUsuario(LUIS).stream().map(Pareja::getId).toList());
        lenient().when(parejaRepository.findActivaDeUsuario(ANA)).thenReturn(List.of(pareja));
        lenient().when(parejaRepository.findActivaDeUsuario(LUIS)).thenReturn(List.of(pareja));

        // El servicio vuelve a leer los movimientos para armar la respuesta, así que
        // los repositorios tienen que devolver lo que el mismo test acaba de guardar.
        lenient().when(aporteRepository.findByParejaIdOrderByFechaDescIdDesc(PAREJA))
                .thenAnswer(invocacion -> List.copyOf(aportes));
        lenient().when(gastoRepository.findByParejaIdOrderByFechaDescIdDesc(PAREJA))
                .thenAnswer(invocacion -> List.copyOf(gastos));
        lenient().when(pagoRepository.findByParejaIdOrderByFechaDescIdDesc(PAREJA))
                .thenAnswer(invocacion -> List.copyOf(pagos));
        lenient().when(aporteRepository.save(any())).thenAnswer(invocacion -> {
            AportacionPareja aporte = invocacion.getArgument(0);
            aporte.setId(siguienteId++);
            aportes.add(aporte);
            return aporte;
        });
        lenient().when(gastoRepository.save(any())).thenAnswer(invocacion -> {
            GastoPareja gasto = invocacion.getArgument(0);
            gasto.setId(siguienteId++);
            gastos.add(gasto);
            repartosPorGasto.put(gasto.getId(), new ArrayList<>());
            return gasto;
        });
        lenient().when(repartoRepository.save(any())).thenAnswer(invocacion -> {
            RepartoGasto reparto = invocacion.getArgument(0);
            reparto.setId(siguienteId++);
            repartosPorGasto.get(reparto.getGasto().getId()).add(reparto);
            return reparto;
        });
        lenient().when(pagoRepository.save(any())).thenAnswer(invocacion -> {
            PagoPareja pago = invocacion.getArgument(0);
            pago.setId(siguienteId++);
            pagos.add(pago);
            return pago;
        });
        lenient().when(repartoRepository.findByGastoIdOrderByIdAsc(anyLong()))
                .thenAnswer(invocacion -> List.copyOf(repartosPorGasto.getOrDefault(invocacion.getArgument(0), List.of())));
    }

    private static Usuario usuario(Long id, String nombre, String email) {
        return Usuario.builder().id(id).nombre(nombre).email(email).activo(true).build();
    }

    private static BigDecimal monto(String valor) {
        return new BigDecimal(valor).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private static AportacionParejaRequest aporte(String valor) {
        return new AportacionParejaRequest(monto(valor), HOY, null);
    }

    private static GastoParejaRequest gasto(String valor, TipoReparto tipo,
                                             String porcentaje, String exacto) {
        return new GastoParejaRequest(monto(valor), HOY, "Cena", tipo,
                porcentaje == null ? null : new BigDecimal(porcentaje),
                exacto == null ? null : monto(exacto));
    }

    private List<RepartoGasto> partesDelUltimoGasto() {
        return repartosPorGasto.get(gastos.get(gastos.size() - 1).getId());
    }

    private RepartoGasto parteDe(List<RepartoGasto> partes, Long usuarioId) {
        return partes.stream().filter(parte -> parte.getUsuario().getId().equals(usuarioId)).findFirst().orElseThrow();
    }

    // ------------------------------------------------------------------ vínculo

    @Test
    void vinculaConLaMonedaPreferidaDeQuienInvita() {
        ana.setMonedaPreferida("USD");
        // El service recorta los espacios; que el correo se resuelva sin distinguir
        // mayusculas es del repositorio, no de aqui.
        when(usuarioRepository.findByEmailIgnoreCase("Luis@Example.com")).thenReturn(Optional.of(luis));
        when(parejaRepository.contarActivasDeUsuario(anyLong())).thenReturn(0L);
        when(parejaRepository.save(any())).thenAnswer(invocacion -> {
            Pareja guardada = invocacion.getArgument(0);
            guardada.setId(PAREJA);
            return guardada;
        });

        var respuesta = servicio.crear(ANA, new ParejaCrearRequest("  Luis@Example.com "));

        assertEquals(PAREJA, respuesta.id());
        assertEquals("USD", respuesta.moneda());
        assertEquals("ana@example.com", respuesta.remitenteEmail());
        assertEquals("luis@example.com", respuesta.destinatarioEmail());
        assertFalse(respuesta.recibida());
    }

    @Test
    void noDejaVincularteContigoMismo() {
        when(usuarioRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.of(ana));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> servicio.crear(ANA, new ParejaCrearRequest("ana@example.com")));

        assertTrue(error.getMessage().contains("ti mismo"));
        verify(parejaRepository, never()).save(any());
    }

    @Test
    void avisaQueLaPersonaNecesitaRegistrarseAntes() {
        when(usuarioRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.empty());

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> servicio.crear(ANA, new ParejaCrearRequest("nadie@example.com")));

        assertTrue(error.getMessage().contains("registrarse"));
    }

    @Test
    void noDejaTenerDosParejasActivas() {
        when(parejaRepository.contarActivasDeUsuario(ANA)).thenReturn(1L);

        assertThrows(IllegalArgumentException.class,
                () -> servicio.crear(ANA, new ParejaCrearRequest("luis@example.com")));

        verify(parejaRepository, never()).save(any());
    }

    @Test
    void noDejaVincularseConAlguienQueYaTienePareja() {
        when(parejaRepository.contarActivasDeUsuario(ANA)).thenReturn(0L);
        when(parejaRepository.contarActivasDeUsuario(LUIS)).thenReturn(1L);
        when(usuarioRepository.findByEmailIgnoreCase("luis@example.com")).thenReturn(Optional.of(luis));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> servicio.crear(ANA, new ParejaCrearRequest("luis@example.com")));

        assertTrue(error.getMessage().contains("ya tiene una pareja"));
    }

    @Test
    void sinParejaVinculadaLaPantallaNoFalla() {
        when(parejaRepository.findActivaDeUsuario(ANA)).thenReturn(List.of());

        assertNull(servicio.obtener(ANA));
    }

    @Test
    void desvinacularDesactivaEnLieuDeBorrarElHistorial() {
        when(parejaRepository.findByIdAndActivaTrue(PAREJA)).thenReturn(Optional.of(pareja));

        servicio.desvincular(ANA, PAREJA);

        assertFalse(pareja.isActiva());
        verify(parejaRepository, never()).delete(any());
    }

    @Test
    void noDejaDesvincularLaParejaDeOtro() {
        when(parejaRepository.findByIdAndActivaTrue(PAREJA)).thenReturn(Optional.of(pareja));

        assertThrows(IllegalArgumentException.class, () -> servicio.desvincular(99L, PAREJA));
    }

    // ------------------------------------------------------------------ reparto

    @Test
    void repartoIgualParteElGastoAMitad() {
        servicio.agregarGasto(ANA, gasto("100.00", TipoReparto.IGUAL, null, null));

        List<RepartoGasto> partes = partesDelUltimoGasto();
        assertEquals(2, partes.size());
        assertEquals(monto("50.00"), parteDe(partes, ANA).getMonto());
        assertEquals(monto("50.00"), parteDe(partes, LUIS).getMonto());
    }

    /**
     * El caso que justifica calcular la parte de la pareja y deducir la propia por
     * resta: un total impar no se puede partir en dos centavos exactos.
     */
    @Test
    void repartoIgualConImparNoPierdeCentavos() {
        servicio.agregarGasto(ANA, gasto("10.01", TipoReparto.IGUAL, null, null));

        List<RepartoGasto> partes = partesDelUltimoGasto();
        // El centavo impar se lo queda la pareja y Ana se queda el resto.
        assertEquals(monto("5.00"), parteDe(partes, ANA).getMonto());
        assertEquals(monto("5.01"), parteDe(partes, LUIS).getMonto());
        assertSumaTotal(partes, "10.01");
    }

    @Test
    void repartoPorcentualDejaElRestoParaQuienRegistra() {
        servicio.agregarGasto(ANA, gasto("200.00", TipoReparto.PORCENTAJE, "30", null));

        List<RepartoGasto> partes = partesDelUltimoGasto();
        assertEquals(monto("60.00"), parteDe(partes, LUIS).getMonto());
        assertEquals(monto("140.00"), parteDe(partes, ANA).getMonto());
        assertEquals(monto("30.00"), parteDe(partes, LUIS).getPorcentaje());
        assertEquals(monto("70.00"), parteDe(partes, ANA).getPorcentaje());
        assertSumaTotal(partes, "200.00");
    }

    @Test
    void repartoExactoTomaElImporteIndicado() {
        servicio.agregarGasto(ANA, gasto("80.00", TipoReparto.EXACTO, null, "35.50"));

        List<RepartoGasto> partes = partesDelUltimoGasto();
        assertEquals(monto("35.50"), parteDe(partes, LUIS).getMonto());
        assertEquals(monto("44.50"), parteDe(partes, ANA).getMonto());
        assertSumaTotal(partes, "80.00");
    }

    @Test
    void elPorcentajeSeRedondeaYElTotalSigueCuadrando() {
        servicio.agregarGasto(ANA, gasto("33.33", TipoReparto.PORCENTAJE, "33.33", null));

        assertSumaTotal(partesDelUltimoGasto(), "33.33");
    }

    @Test
    void guardaLasDosPartesConElMismoTipoDeReparto() {
        servicio.agregarGasto(ANA, gasto("60.00", TipoReparto.EXACTO, null, "25.00"));

        assertTrue(partesDelUltimoGasto().stream().allMatch(parte -> parte.getTipo() == TipoReparto.EXACTO));
    }

    @Test
    void rechazaPorcentajeDeCienQueDejariaSinParteAlRegistro() {
        assertThrows(IllegalArgumentException.class,
                () -> servicio.agregarGasto(ANA, gasto("100.00", TipoReparto.PORCENTAJE, "100", null)));
        assertThrows(IllegalArgumentException.class,
                () -> servicio.agregarGasto(ANA, gasto("100.00", TipoReparto.PORCENTAJE, "0", null)));
    }

    @Test
    void rechazaMontoExactoIgualAlTotal() {
        assertThrows(IllegalArgumentException.class,
                () -> servicio.agregarGasto(ANA, gasto("100.00", TipoReparto.EXACTO, null, "100.00")));
    }

    @Test
    void pideElDatoQueFaltaSegunElTipoDeReparto() {
        IllegalArgumentException porcentaje = assertThrows(IllegalArgumentException.class,
                () -> servicio.agregarGasto(ANA, gasto("100.00", TipoReparto.PORCENTAJE, null, null)));
        assertTrue(porcentaje.getMessage().contains("porcentaje"));

        IllegalArgumentException exacto = assertThrows(IllegalArgumentException.class,
                () -> servicio.agregarGasto(ANA, gasto("100.00", TipoReparto.EXACTO, null, null)));
        assertTrue(exacto.getMessage().contains("exactamente"));
    }

    // ------------------------------------------------------------------ saldo

    @Test
    void elSaldoEsLoAportadoMenosLoConsumido() {
        servicio.agregarAporte(ANA, aporte("500.00"));
        servicio.agregarAporte(LUIS, aporte("300.00"));
        servicio.agregarGasto(ANA, gasto("400.00", TipoReparto.IGUAL, null, null));

        ParejaResponse estado = servicio.obtener(ANA);

        assertEquals(monto("800.00"), estado.resumen().totalAportado());
        assertEquals(monto("400.00"), estado.resumen().totalGastado());
        assertEquals(monto("400.00"), estado.resumen().fondoDisponible());
        // Ana puso 500 y consumio 200; Luis puso 300 y consumio 200.
        assertEquals(monto("300.00"), estado.yo().saldo());
        assertEquals(monto("100.00"), estado.pareja().saldo());
    }

    @Test
    void losSaldosSumanElFondoComun() {
        servicio.agregarAporte(ANA, aporte("250.00"));
        servicio.agregarAporte(LUIS, aporte("250.00"));
        servicio.agregarGasto(ANA, gasto("333.33", TipoReparto.EXACTO, null, "99.99"));
        servicio.agregarGasto(LUIS, gasto("111.11", TipoReparto.PORCENTAJE, "75", null));

        ParejaResponse estado = servicio.obtener(ANA);

        assertEquals(estado.resumen().fondoDisponible(),
                estado.yo().saldo().add(estado.pareja().saldo()).setScale(2, java.math.RoundingMode.HALF_UP),
                "la suma de los dos saldos tiene que ser lo que queda en el fondo");
    }

    @Test
    void avisaQuienDebeYCuanto() {
        // Ana pone casi todo y el gasto se parte a la mitad. Luis puso 50 pero
        // consumio 150, asi que le debe esos 100 a Ana.
        servicio.agregarAporte(ANA, aporte("500.00"));
        servicio.agregarAporte(LUIS, aporte("50.00"));
        servicio.agregarGasto(ANA, gasto("300.00", TipoReparto.IGUAL, null, null));

        ParejaResponse estado = servicio.obtener(ANA);

        assertEquals(LUIS, estado.resumen().idQuienDebe());
        assertEquals(monto("100.00"), estado.resumen().montoDeuda());
        assertEquals(monto("350.00"), estado.yo().saldo());
        assertEquals(monto("-100.00"), estado.pareja().saldo());
    }

    @Test
    void losDosAportanIgualNoHayDeuda() {
        servicio.agregarAporte(ANA, aporte("500.00"));
        servicio.agregarAporte(LUIS, aporte("200.00"));
        servicio.agregarGasto(ANA, gasto("300.00", TipoReparto.IGUAL, null, null));

        assertNull(servicio.obtener(ANA).resumen().idQuienDebe());
    }

    @Test
    void conElFondoEnRojoNoLeCobraANadie() {
        servicio.agregarAporte(ANA, aporte("100.00"));
        servicio.agregarGasto(ANA, gasto("300.00", TipoReparto.IGUAL, null, null));

        ParejaResponse estado = servicio.obtener(ANA);

        assertEquals(monto("-200.00"), estado.resumen().fondoDisponible());
        assertNull(estado.resumen().idQuienDebe(),
                "si los dos gastaron mas de lo que pusieron no hay a quien reclamarle");
        assertEquals(monto("0.00"), estado.resumen().montoDeuda());
    }

    @Test
    void sinDeudaNoSenalaANadie() {
        // Cada quien aporta justo lo que consume: los dos saldos quedan en cero.
        servicio.agregarAporte(ANA, aporte("100.00"));
        servicio.agregarAporte(LUIS, aporte("100.00"));
        servicio.agregarGasto(ANA, gasto("200.00", TipoReparto.IGUAL, null, null));

        ParejaResponse estado = servicio.obtener(ANA);

        assertEquals(monto("0.00"), estado.yo().saldo());
        assertEquals(monto("0.00"), estado.pareja().saldo());
        assertNull(estado.resumen().idQuienDebe());
    }

    @Test
    void quienConsumeSinAportarQuedaDebiendo() {
        servicio.agregarAporte(ANA, aporte("200.00"));
        servicio.agregarGasto(ANA, gasto("200.00", TipoReparto.IGUAL, null, null));

        ParejaResponse estado = servicio.obtener(ANA);

        assertEquals(LUIS, estado.resumen().idQuienDebe());
        assertEquals(monto("100.00"), estado.resumen().montoDeuda());
    }

    // ------------------------------------------------------------------ pagos

    @Test
    void unPagoSalaLaDeudaSinMoverElFondo() {
        // Ana aporta los 300 del gasto, Luis no pone nada: Luis debe 150. Al pagar
        // esos 150 los dos saldos quedan en cero y el fondo sigue en cero.
        servicio.agregarAporte(ANA, aporte("300.00"));
        servicio.agregarGasto(ANA, gasto("300.00", TipoReparto.IGUAL, null, null));
        servicio.registrarPago(LUIS, new PagoParejaRequest(monto("150.00"), HOY, LUIS, ANA, "Transferencia"));

        ParejaResponse estado = servicio.obtener(ANA);

        assertEquals(monto("0.00"), estado.yo().saldo());
        assertEquals(monto("0.00"), estado.pareja().saldo());
        assertEquals(monto("0.00"), estado.resumen().fondoDisponible(), "el pago es un traspaso interno");
        assertNull(estado.resumen().idQuienDebe());
        assertEquals(monto("150.00"), estado.yo().cobrado());
        assertEquals(monto("150.00"), estado.pareja().pagado());
    }

    @Test
    void noDejaPagarseASuPropiaPareja() {
        assertThrows(IllegalArgumentException.class,
                () -> servicio.registrarPago(ANA, new PagoParejaRequest(monto("10.00"), HOY, ANA, ANA, null)));
    }

    @Test
    void noDejaRegistrarPagosDeAlguienQueNoEsLaPareja() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> servicio.registrarPago(ANA, new PagoParejaRequest(monto("10.00"), HOY, ANA, 99L, null)));

        assertTrue(error.getMessage().contains("no pertenece"));
    }

    @Test
    void elPagoRegistradoApareceEnElListado() {
        servicio.registrarPago(LUIS, new PagoParejaRequest(monto("75.00"), HOY, LUIS, ANA, "Bizum"));

        ParejaResponse estado = servicio.obtener(ANA);

        assertEquals(1, estado.pagos().size());
        assertEquals(LUIS, estado.pagos().get(0).pagadorId());
        assertEquals(ANA, estado.pagos().get(0).beneficiarioId());
        assertEquals(monto("75.00"), estado.yo().cobrado());
        assertEquals(monto("75.00"), estado.pareja().pagado());
    }

    // ------------------------------------------------------------------ aislamiento

    @Test
    void noDejaBorrarUnGastoDeOtraPareja() {
        when(gastoRepository.findByIdAndParejaId(anyLong(), anyLong())).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> servicio.eliminarGasto(ANA, 999L));
    }

    @Test
    void noDejaBorrarUnAporteDeOtraPareja() {
        when(aporteRepository.findByIdAndParejaId(anyLong(), anyLong())).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> servicio.eliminarAporte(ANA, 999L));
    }

    @Test
    void noDejaBorrarUnPagoDeOtraPareja() {
        when(pagoRepository.findByIdAndParejaId(anyLong(), anyLong())).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> servicio.eliminarPago(ANA, 999L));
    }

    @Test
    void sinParejaNoDejaRegistrarMovimientos() {
        when(parejaRepository.findActivaDeUsuario(ANA)).thenReturn(List.of());

        assertThrows(IllegalArgumentException.class, () -> servicio.agregarAporte(ANA, aporte("100.00")));
        assertThrows(IllegalArgumentException.class,
                () -> servicio.agregarGasto(ANA, gasto("100.00", TipoReparto.IGUAL, null, null)));
    }

    @Test
    void elGastoDevueltoTraeMiParteYaResuelta() {
        servicio.agregarGasto(ANA, gasto("90.00", TipoReparto.PORCENTAJE, "40", null));

        ParejaResponse estado = servicio.obtener(ANA);

        ParejaResponse.Gasto gasto = estado.gastos().get(0);
        assertEquals(monto("54.00"), gasto.miParte());
        assertEquals(TipoReparto.PORCENTAJE, gasto.tipoReparto());
        assertEquals(2, gasto.repartos().size());
        assertNotNull(gasto.pagadoPorNombre());
    }

    private void assertSumaTotal(List<RepartoGasto> partes, String total) {
        BigDecimal suma = partes.stream().map(RepartoGasto::getMonto).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(monto(total), suma.setScale(2, java.math.RoundingMode.HALF_UP),
                "las dos partes tienen que sumar el total del gasto");
    }
}
