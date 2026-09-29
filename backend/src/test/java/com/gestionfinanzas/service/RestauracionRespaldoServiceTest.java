package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.gestionfinanzas.dto.response.AsientoContableResponse;
import com.gestionfinanzas.dto.response.AuditoriaTransaccionResponse;
import com.gestionfinanzas.dto.response.CategoriaResponse;
import com.gestionfinanzas.dto.response.CuentaResponse;
import com.gestionfinanzas.dto.response.LineaAsientoResponse;
import com.gestionfinanzas.dto.response.PerfilResponse;
import com.gestionfinanzas.dto.response.PlantillaRecurrenteResponse;
import com.gestionfinanzas.dto.response.RespaldoFinancieroResponse;
import com.gestionfinanzas.dto.response.TransaccionResponse;
import com.gestionfinanzas.model.entity.AsientoContable;
import com.gestionfinanzas.model.entity.AuditoriaTransaccion;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.PlantillaRecurrente;
import com.gestionfinanzas.model.entity.Presupuesto;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.FrecuenciaRecurrencia;
import com.gestionfinanzas.model.enums.LadoContable;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.AsientoContableRepository;
import com.gestionfinanzas.repository.AuditoriaTransaccionRepository;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
import com.gestionfinanzas.repository.PresupuestoRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.TimeZone;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@ActiveProfiles("test")
class RestauracionRespaldoServiceTest {

    private static final Long CUENTA_ARCHIVO = 71L;
    private static final Long CATEGORIA_ARCHIVO = 81L;
    private static final Long MOVIMIENTO_ARCHIVO = 91L;
    private static final Long CASHBACK_ARCHIVO = 92L;
    private static final Instant FECHA_EVENTO = Instant.parse("2024-03-15T18:45:00Z");
    private static final LocalDateTime FECHA_ASIENTO = LocalDateTime.of(2024, 3, 15, 18, 46);

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private CuentaRepository cuentaRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private PresupuestoRepository presupuestoRepository;

    @Autowired
    private PlantillaRecurrenteRepository plantillaRepository;

    @Autowired
    private TransaccionRepository transaccionRepository;

    @Autowired
    private AuditoriaTransaccionRepository auditoriaRepository;

    @Autowired
    private AsientoContableRepository asientoRepository;

    private ObjectMapper objectMapper;
    private RestauracionRespaldoService servicio;

    @BeforeEach
    void prepararServicio() {
        objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        UsuarioRepository usuarios = UsuarioRepository.class.cast(Proxy.newProxyInstance(
                UsuarioRepository.class.getClassLoader(),
                new Class<?>[]{UsuarioRepository.class},
                (proxy, metodo, argumentos) -> {
                    if ("findByIdForUpdate".equals(metodo.getName())) {
                        return usuarioRepository.findById((Long) argumentos[0]);
                    }
                    try {
                        return metodo.invoke(usuarioRepository, argumentos);
                    } catch (InvocationTargetException excepcion) {
                        throw excepcion.getCause();
                    }
                }));
        servicio = new RestauracionRespaldoService(
                usuarios, cuentaRepository, categoriaRepository, presupuestoRepository,
                plantillaRepository, transaccionRepository, auditoriaRepository, asientoRepository,
                objectMapper);
    }

    @Test
    void restauraLaFechaDelEventoDeAuditoriaAunqueLaColumnaNoSeaActualizable() {
        Usuario usuario = crearUsuario();
        AuditoriaTransaccion evento = auditoriaRepository.saveAndFlush(AuditoriaTransaccion.builder()
                .usuario(usuario).transaccionId(1L).accion("CREAR").fechaEvento(FECHA_EVENTO).build());
        entityManager.clear();

        assertNotEquals(FECHA_EVENTO, auditoriaRepository.findById(evento.getId()).orElseThrow().getFechaEvento(),
                "@CreationTimestamp pisa el valor enviado al insertar, por eso hace falta un segundo UPDATE");

        auditoriaRepository.restaurarFechaEvento(evento.getId(), FECHA_EVENTO);
        entityManager.flush();
        entityManager.clear();

        assertInstanteRestaurado(FECHA_EVENTO,
                auditoriaRepository.findById(evento.getId()).orElseThrow().getFechaEvento());
    }

    @Test
    void restauraLaFechaDeCreacionDelAsientoContableAunqueLaColumnaNoSeaActualizable() {
        Usuario usuario = crearUsuario();
        AsientoContable asiento = asientoRepository.saveAndFlush(AsientoContable.builder()
                .usuario(usuario).transaccionOrigenId(1L).tipoEvento("TRANSACCION")
                .tipoMovimiento(TipoTransaccion.GASTO).fechaOperacion(LocalDate.of(2024, 3, 15))
                .descripcion("Gasto en efectivo").build());
        entityManager.clear();

        assertNotEquals(FECHA_ASIENTO, asientoRepository.findById(asiento.getId()).orElseThrow().getFechaCreacion());

        asientoRepository.restaurarFechaCreacion(asiento.getId(), FECHA_ASIENTO);
        entityManager.flush();
        entityManager.clear();

        assertEquals(FECHA_ASIENTO, asientoRepository.findById(asiento.getId()).orElseThrow().getFechaCreacion());
    }

    @Test
    void remapeaCadaIdentificadorDelArchivoHaciaLosIdentificadoresNuevos() throws Exception {
        Usuario usuario = crearUsuario();

        servicio.restaurar(usuario.getId(), archivoCompleto().build());
        entityManager.flush();
        entityManager.clear();

        Transaccion movimiento = transaccionRepository.findAllByUsuarioIdOrderByFechaAscIdAsc(usuario.getId()).getFirst();
        Long cuentaNueva = movimiento.getCuenta().getId();
        Long categoriaNueva = movimiento.getCategoria().getId();

        assertNotEquals(CUENTA_ARCHIVO, cuentaNueva);
        assertNotEquals(CATEGORIA_ARCHIVO, categoriaNueva);
        assertNotEquals(MOVIMIENTO_ARCHIVO, movimiento.getId());
        assertEquals("Nomina", movimiento.getCuenta().getNombre());
        assertEquals("Mascotas", movimiento.getCategoria().getNombre());

        List<Cuenta> cuentas = cuentaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuario.getId());
        assertEquals(1, cuentas.size());
        assertEquals(0, cuentas.getFirst().getSaldoActual().compareTo(new BigDecimal("1500.00")));

        List<Categoria> categorias = categoriaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuario.getId());
        assertEquals(1, categorias.size());
        assertEquals(categoriaNueva, categorias.getFirst().getId());

        Presupuesto presupuesto = presupuestoRepository.findAllByUsuarioIdOrderByAnioDescMesDescIdAsc(usuario.getId()).getFirst();
        assertEquals(categoriaNueva, presupuesto.getCategoria().getId());
        assertEquals("MXN", presupuesto.getMoneda());

        PlantillaRecurrente plantilla = plantillaRepository.findAllByUsuarioIdOrderBySiguienteFechaAsc(usuario.getId()).getFirst();
        assertEquals(cuentaNueva, plantilla.getCuenta().getId());
        assertEquals(categoriaNueva, plantilla.getCategoria().getId());

        AuditoriaTransaccion evento = auditoriaRepository.findAllByUsuarioIdOrderByFechaEventoAscIdAsc(usuario.getId()).getFirst();
        assertEquals(movimiento.getId(), evento.getTransaccionId());
        assertInstanteRestaurado(FECHA_EVENTO, evento.getFechaEvento());
        assertNull(evento.getAntesJson());

        JsonNode despues = objectMapper.readTree(evento.getDespuesJson());
        assertEquals(movimiento.getId().longValue(), despues.get("id").asLong());
        assertEquals(cuentaNueva.longValue(), despues.get("cuentaId").asLong(),
                "El snapshot del historial debe apuntar a la cuenta nueva, no a la del archivo");
        assertEquals(categoriaNueva.longValue(), despues.get("categoriaId").asLong());

        AsientoContable asiento = asientoRepository.findAllByUsuarioIdOrderByFechaOperacionAscIdAsc(usuario.getId()).getFirst();
        assertEquals(movimiento.getId(), asiento.getTransaccionOrigenId());
        assertEquals(FECHA_ASIENTO, asiento.getFechaCreacion());
        assertEquals(2, asiento.getLineas().size());
        assertEquals(cuentaNueva, asiento.getLineas().get(0).getCuentaFinancieraId());
        assertEquals(categoriaNueva, asiento.getLineas().get(0).getCategoriaId());
        assertNull(asiento.getLineas().get(1).getCategoriaId());
    }

    @Test
    void conservaElVinculoDeCashbackEntreLaCompraYSuDevolucion() {
        Usuario usuario = crearUsuario();

        servicio.restaurar(usuario.getId(), archivoCompleto().conCashback().build());
        entityManager.flush();
        entityManager.clear();

        List<Transaccion> movimientos = transaccionRepository.findAllByUsuarioIdOrderByFechaAscIdAsc(usuario.getId());
        assertEquals(2, movimientos.size());
        Transaccion compra = movimientos.stream()
                .filter(movimiento -> movimiento.getTipo() == TipoTransaccion.GASTO).findFirst().orElseThrow();
        Transaccion devolucion = movimientos.stream()
                .filter(movimiento -> movimiento.getTipo() == TipoTransaccion.INGRESO).findFirst().orElseThrow();

        assertEquals(compra.getId(), devolucion.getCashbackOrigen().getId());
        assertNull(compra.getCashbackOrigen());
    }

    @Test
    void aceptaUnaCuentaNuevaConLaBilleteraYLasCategoriasDeFabricaIntactas() {
        Usuario usuario = crearUsuario();
        crearBilleteraInicial(usuario);
        crearCategoriasIniciales(usuario);

        servicio.restaurar(usuario.getId(), archivoCompleto().build());
        entityManager.flush();
        entityManager.clear();

        List<Cuenta> cuentas = cuentaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuario.getId());
        assertEquals(1, cuentas.size());
        assertEquals("Nomina", cuentas.getFirst().getNombre());

        List<Categoria> categorias = categoriaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuario.getId());
        assertEquals(1, categorias.size(), "Las categorias de fabrica se reemplazan por las del archivo");
        assertEquals("Mascotas", categorias.getFirst().getNombre());
    }

    @Test
    void rechazaYNoBorraNadaCuandoLaCuentaYaTieneMovimientos() {
        Usuario usuario = crearUsuario();
        crearBilleteraInicial(usuario);
        crearCategoriasIniciales(usuario);
        guardarGastoPrevio(usuario);

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> servicio.restaurar(usuario.getId(), archivoCompleto().build()));

        assertTrue(error.getMessage().contains("no tiene datos financieros"), error::getMessage);
        assertEquals(1, cuentaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuario.getId()).size());
        assertEquals(8, categoriaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuario.getId()).size());
        assertEquals(1, transaccionRepository.findAllByUsuarioIdOrderByFechaAscIdAsc(usuario.getId()).size());
    }

    @Test
    void rechazaCuandoLaBilleteraInicialYaAcuSaldo() {
        Usuario usuario = crearUsuario();
        Cuenta billetera = crearBilleteraInicial(usuario);
        billetera.setSaldoActual(new BigDecimal("120.00"));
        cuentaRepository.saveAndFlush(billetera);
        crearCategoriasIniciales(usuario);

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> servicio.restaurar(usuario.getId(), archivoCompleto().build()));

        assertTrue(error.getMessage().contains("no tiene datos financieros"), error::getMessage);
    }

    @Test
    void rechazaCuandoLasCategoriasDeFabricaFueronPersonalizadas() {
        Usuario usuario = crearUsuario();
        crearBilleteraInicial(usuario);
        Categoria alterada = crearCategoriasIniciales(usuario).getFirst();
        alterada.setColor("#000000");
        categoriaRepository.saveAndFlush(alterada);

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> servicio.restaurar(usuario.getId(), archivoCompleto().build()));

        assertTrue(error.getMessage().contains("no tiene datos financieros"), error::getMessage);
    }

    @Test
    void rechazaSinEscribirNadaUnNombreDeCuentaDemasiadoLargo() {
        assertRechazadoSinEscribir(
                archivoCompleto().conCuenta(72L, "a".repeat(101), TipoCuenta.DEBITO, new BigDecimal("1500.00")),
                "cuenta incompleta");
    }

    @Test
    void rechazaSinEscribirNadaUnaDescripcionDeCuentaDemasiadoLarga() {
        Archivo archivo = archivoCompleto();
        archivo.cuentas.set(0, new CuentaResponse(CUENTA_ARCHIVO, "Nomina", TipoCuenta.DEBITO, "Banco",
                null, null, null, 10, 20, new BigDecimal("1500.00"), "MXN", "d".repeat(256), true, null));

        assertRechazadoSinEscribir(archivo, "textos demasiado largos");
    }

    @Test
    void rechazaSinEscribirNadaUnaMonedaDeCuentaDemasiadoCorta() {
        assertRechazadoSinEscribir(archivoCompleto().conCuentaMoneda(72L, "MX"), "cuenta incompleta");
    }

    @Test
    void rechazaSinEscribirNadaUnDiaDeCorteFueraDeRango() {
        Archivo archivo = archivoCompleto();
        archivo.cuentas.set(0, new CuentaResponse(CUENTA_ARCHIVO, "Nomina", TipoCuenta.DEBITO, "Banco",
                null, null, null, 45, 10, new BigDecimal("1500.00"), "MXN", null, true, null));

        assertRechazadoSinEscribir(archivo, "corte o de pago");
    }

    @Test
    void rechazaSinEscribirNadaCuentasConNombresDuplicados() {
        assertRechazadoSinEscribir(
                archivoCompleto().conCuenta(72L, "Nomina", TipoCuenta.AHORRO, new BigDecimal("10.00")),
                "nombres duplicados");
    }

    @Test
    void rechazaSinEscribirNadaIdentificadoresRepetidosEnElArchivo() {
        Archivo archivo = archivoCompleto();
        archivo.cuentas.add(archivo.cuentas.getFirst());

        assertRechazadoSinEscribir(archivo, "identificadores repetidos");
    }

    @Test
    void rechazaSinEscribirNadaUnMovimientoQueApuntaACuentaInexistente() {
        Archivo archivo = archivoCompleto();
        archivo.transacciones.set(0, conCuenta(archivo.transacciones.getFirst(), 999L));

        assertRechazadoSinEscribir(archivo, "de un movimiento que no existe");
    }

    @Test
    void rechazaSinEscribirNadaUnaTransferenciaSinCuentaDestino() {
        Archivo archivo = archivoCompleto();
        archivo.transacciones.set(0, new TransaccionResponse(MOVIMIENTO_ARCHIVO, CUENTA_ARCHIVO, "Nomina",
                null, null, CATEGORIA_ARCHIVO, "Mascotas", "dog", "#123456", TipoTransaccion.TRANSFERENCIA,
                new BigDecimal("250.00"), null, null, "MXN", null, LocalDate.of(2024, 3, 15),
                "Transferencia", null, false, null));

        assertRechazadoSinEscribir(archivo, "transferencia sin cuenta destino");
    }

    @Test
    void rechazaSinEscribirNadaUnMontoDeMovimientoNoPositivo() {
        Archivo archivo = archivoCompleto();
        archivo.transacciones.set(0, conMonto(archivo.transacciones.getFirst(), BigDecimal.ZERO));

        assertRechazadoSinEscribir(archivo, "movimiento incompleto");
    }

    @Test
    void rechazaSinEscribirNadaUnMovimientoQueApuntaACategoriaNoDisponible() {
        Archivo archivo = archivoCompleto();
        archivo.transacciones.set(0, conCategoria(archivo.transacciones.getFirst(), 999L, "Arboles", "tree"));

        assertRechazadoSinEscribir(archivo, "incluida ni disponible");
    }

    @Test
    void rechazaSinEscribirNadaUnPresupuestoSinCategoria() {
        Archivo archivo = archivoCompleto();
        archivo.presupuestos.clear();
        archivo.presupuestos.add(new RespaldoFinancieroResponse.PresupuestoRespaldo(
                1L, null, new BigDecimal("800.00"), "MXN", 3, 2024));

        assertRechazadoSinEscribir(archivo, "presupuesto sin categor");
    }

    @Test
    void rechazaSinEscribirNadaUnPresupuestoConMonedaInvalida() {
        Archivo archivo = archivoCompleto();
        archivo.presupuestos.set(0, new RespaldoFinancieroResponse.PresupuestoRespaldo(
                1L, CATEGORIA_ARCHIVO, new BigDecimal("800.00"), "MX", 3, 2024));

        assertRechazadoSinEscribir(archivo, "con una moneda no v");
    }

    @Test
    void rechazaSinEscribirNadaDosPresupuestosParaLaMismaCategoriaYPeriodo() {
        Archivo archivo = archivoCompleto();
        archivo.presupuestos.add(new RespaldoFinancieroResponse.PresupuestoRespaldo(
                2L, CATEGORIA_ARCHIVO, new BigDecimal("500.00"), "MXN", 3, 2024));

        assertRechazadoSinEscribir(archivo, "dos presupuestos para la misma");
    }

    @Test
    void rechazaSinEscribirNadaUnAsientoQueNoCuadraPorMoneda() {
        Archivo archivo = archivoCompleto();
        archivo.asientos.set(0, new AsientoContableResponse(1L, MOVIMIENTO_ARCHIVO, "TRANSACCION",
                TipoTransaccion.GASTO, LocalDate.of(2024, 3, 15), "Gasto descuadrado", null, FECHA_ASIENTO, List.of(
                linea("5-1", "Gastos", new BigDecimal("250.00"), "MXN", LadoContable.DEBE, CUENTA_ARCHIVO, CATEGORIA_ARCHIVO),
                linea("1-1", "Efectivo", new BigDecimal("100.00"), "MXN", LadoContable.HABER, CUENTA_ARCHIVO, null))));

        assertRechazadoSinEscribir(archivo, "asiento que no cuadra por moneda");
    }

    @Test
    void rechazaSinEscribirNadaUnEventoDeHistorialSinTransaccion() {
        Archivo archivo = archivoCompleto();
        archivo.historial.set(0, new AuditoriaTransaccionResponse(1L, null, "CREAR", null, null, FECHA_EVENTO));

        assertRechazadoSinEscribir(archivo, "evento de historial");
    }

    @Test
    void rechazaSinEscribirNadaUnArchivoDeVersionIncompatible() {
        Archivo archivo = archivoCompleto();
        archivo.version = 99;

        assertRechazadoSinEscribir(archivo, "no tiene el formato de un respaldo");
    }

    @Test
    void previsualizaElArchivoYAvisaQueNoSePuedeRestaurarSobreUnaCuentaConMovimientos() {
        Usuario usuario = crearUsuario();
        crearBilleteraInicial(usuario);
        crearCategoriasIniciales(usuario);
        guardarGastoPrevio(usuario);

        var vista = servicio.previsualizar(usuario.getId(), archivoCompleto().build());

        assertFalse(vista.destinoVacio());
        assertFalse(vista.puedeRestaurar());
        assertEquals(1, vista.cuentas());
        assertEquals(1, vista.categorias());
        assertEquals(1, vista.transacciones());
        assertEquals(1, vista.eventosHistorial());
        assertEquals(1, vista.asientosContables());
        assertTrue(vista.advertencias().stream().anyMatch(advertencia -> advertencia.contains("una cuenta nueva")),
                vista.advertencias()::toString);
    }

    @Test
    void previsualizaElArchivoYAvisaQueSeReemplazaranLosDatosIniciales() {
        Usuario usuario = crearUsuario();
        crearBilleteraInicial(usuario);
        crearCategoriasIniciales(usuario);

        var vista = servicio.previsualizar(usuario.getId(), archivoCompleto().build());

        assertTrue(vista.destinoVacio());
        assertTrue(vista.puedeRestaurar());
        assertTrue(vista.advertencias().stream().anyMatch(advertencia -> advertencia.contains("la billetera y las")),
                vista.advertencias()::toString);
    }

    private void assertRechazadoSinEscribir(Archivo archivo, String fragmento) {
        Usuario usuario = crearUsuario();

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> servicio.restaurar(usuario.getId(), archivo.build()));

        assertTrue(error.getMessage().contains(fragmento),
                () -> "Esperaba un mensaje con '" + fragmento + "' pero fue: " + error.getMessage());
        assertEquals(0, cuentaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuario.getId()).size(),
                "La validacion debe ocurrir antes de escribir cuentas");
        assertEquals(0, categoriaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuario.getId()).size());
        assertEquals(0, transaccionRepository.findAllByUsuarioIdOrderByFechaAscIdAsc(usuario.getId()).size());
        assertEquals(0, presupuestoRepository.findAllByUsuarioIdOrderByAnioDescMesDescIdAsc(usuario.getId()).size());
        assertEquals(0, plantillaRepository.findAllByUsuarioIdOrderBySiguienteFechaAsc(usuario.getId()).size());
        assertEquals(0, auditoriaRepository.findAllByUsuarioIdOrderByFechaEventoAscIdAsc(usuario.getId()).size());
        assertEquals(0, asientoRepository.findAllByUsuarioIdOrderByFechaOperacionAscIdAsc(usuario.getId()).size());
    }

    private static void assertInstanteRestaurado(Instant esperado, Instant obtenido) {
        long desviacion = Math.abs(obtenido.getEpochSecond() - esperado.getEpochSecond());
        long desplazamientoZona = Math.abs(TimeZone.getDefault().getOffset(esperado.toEpochMilli()) / 1000L);
        assertTrue(desviacion <= desplazamientoZona,
                () -> "Se esperaba " + esperado + " pero se guardo " + obtenido + ", una desviacion de "
                        + desviacion + "s contra un desplazamiento de zona horaria de " + desplazamientoZona + "s");
    }

    private Usuario crearUsuario() {
        return usuarioRepository.saveAndFlush(Usuario.builder()
                .nombre("Ana").email("ana@example.com").passwordHash("hash").build());
    }

    private void guardarGastoPrevio(Usuario usuario) {
        transaccionRepository.saveAndFlush(Transaccion.builder()
                .usuario(usuario).tipo(TipoTransaccion.GASTO).monto(new BigDecimal("10.00"))
                .fecha(LocalDate.of(2024, 1, 10)).descripcion("Gasto previo").build());
    }

    private Cuenta crearBilleteraInicial(Usuario usuario) {
        return cuentaRepository.saveAndFlush(Cuenta.builder()
                .usuario(usuario).nombre("Billetera / Efectivo").tipo(TipoCuenta.EFECTIVO)
                .saldoActual(BigDecimal.ZERO).moneda("MXN")
                .descripcion("Cuenta predeterminada de efectivo").activo(true).build());
    }

    private List<Categoria> crearCategoriasIniciales(Usuario usuario) {
        List<Categoria> iniciales = List.of(
                categoriaInicial(usuario, "Alimentos y Supermercado", TipoTransaccion.GASTO, "shopping-cart", "#f59e0b"),
                categoriaInicial(usuario, "Vivienda y Servicios", TipoTransaccion.GASTO, "home", "#ef4444"),
                categoriaInicial(usuario, "Transporte", TipoTransaccion.GASTO, "car", "#3b82f6"),
                categoriaInicial(usuario, "Salud y Bienestar", TipoTransaccion.GASTO, "heart", "#ec4899"),
                categoriaInicial(usuario, "Ocio y Salidas", TipoTransaccion.GASTO, "coffee", "#8b5cf6"),
                categoriaInicial(usuario, "Salario", TipoTransaccion.INGRESO, "briefcase", "#10b981"),
                categoriaInicial(usuario, "Inversiones", TipoTransaccion.INGRESO, "trending-up", "#06b6d4"),
                categoriaInicial(usuario, "Otros Ingresos", TipoTransaccion.INGRESO, "plus-circle", "#84cc16"));
        return new ArrayList<>(categoriaRepository.saveAll(iniciales));
    }

    private Categoria categoriaInicial(Usuario usuario, String nombre, TipoTransaccion tipo, String icono, String color) {
        return Categoria.builder().usuario(usuario).nombre(nombre).tipo(tipo).icono(icono).color(color).build();
    }

    private static LineaAsientoResponse linea(String codigo, String nombre, BigDecimal monto, String moneda,
                                              LadoContable lado, Long cuentaId, Long categoriaId) {
        return new LineaAsientoResponse(null, codigo, nombre, monto, moneda, lado, cuentaId, categoriaId);
    }

    private static TransaccionResponse conCuenta(TransaccionResponse origen, Long cuentaId) {
        return new TransaccionResponse(origen.id(), cuentaId, origen.cuentaNombre(), origen.cuentaDestinoId(),
                origen.cuentaDestinoNombre(), origen.categoriaId(), origen.categoriaNombre(), origen.categoriaIcono(),
                origen.categoriaColor(), origen.tipo(), origen.monto(), origen.montoDestino(), origen.tasaCambio(),
                origen.moneda(), origen.monedaDestino(), origen.fecha(), origen.descripcion(), origen.notas(),
                origen.cashbackAutomatico(), origen.fechaCreacion());
    }

    private static TransaccionResponse conMonto(TransaccionResponse origen, BigDecimal monto) {
        return new TransaccionResponse(origen.id(), origen.cuentaId(), origen.cuentaNombre(), origen.cuentaDestinoId(),
                origen.cuentaDestinoNombre(), origen.categoriaId(), origen.categoriaNombre(), origen.categoriaIcono(),
                origen.categoriaColor(), origen.tipo(), monto, origen.montoDestino(), origen.tasaCambio(),
                origen.moneda(), origen.monedaDestino(), origen.fecha(), origen.descripcion(), origen.notas(),
                origen.cashbackAutomatico(), origen.fechaCreacion());
    }

    private static TransaccionResponse conCategoria(TransaccionResponse origen, Long categoriaId, String nombre, String icono) {
        return new TransaccionResponse(origen.id(), origen.cuentaId(), origen.cuentaNombre(), origen.cuentaDestinoId(),
                origen.cuentaDestinoNombre(), categoriaId, nombre, icono, "#123456", origen.tipo(), origen.monto(),
                origen.montoDestino(), origen.tasaCambio(), origen.moneda(), origen.monedaDestino(), origen.fecha(),
                origen.descripcion(), origen.notas(), origen.cashbackAutomatico(), origen.fechaCreacion());
    }

    private static Archivo archivoCompleto() {
        return new Archivo()
                .conCuenta(CUENTA_ARCHIVO, "Nomina", TipoCuenta.DEBITO, new BigDecimal("1500.00"))
                .conCategoria(CATEGORIA_ARCHIVO, "Mascotas", TipoTransaccion.GASTO)
                .conGasto(MOVIMIENTO_ARCHIVO, new BigDecimal("250.00"), "Veterinario")
                .conPresupuesto(new BigDecimal("800.00"), 3, 2024)
                .conRecurrencia(new BigDecimal("120.00"))
                .conEvento(MOVIMIENTO_ARCHIVO, FECHA_EVENTO)
                .conAsiento(new BigDecimal("250.00"));
    }

    private static final class Archivo {

        private int version = 1;
        private final List<CuentaResponse> cuentas = new ArrayList<>();
        private final List<CategoriaResponse> categorias = new ArrayList<>();
        private final List<TransaccionResponse> transacciones = new ArrayList<>();
        private final List<RespaldoFinancieroResponse.PresupuestoRespaldo> presupuestos = new ArrayList<>();
        private final List<PlantillaRecurrenteResponse> recurrencias = new ArrayList<>();
        private final List<AuditoriaTransaccionResponse> historial = new ArrayList<>();
        private final List<AsientoContableResponse> asientos = new ArrayList<>();
        private List<RespaldoFinancieroResponse.CashbackRespaldo> cashback;

        Archivo conCuenta(Long id, String nombre, TipoCuenta tipo, BigDecimal saldo) {
            cuentas.add(new CuentaResponse(id, nombre, tipo, "Banco", null, null, null, 10, 20, saldo, "MXN", null, true, null));
            return this;
        }

        Archivo conCuentaMoneda(Long id, String moneda) {
            cuentas.add(new CuentaResponse(id, "Cuenta " + id, TipoCuenta.DEBITO, "Banco", null, null, null,
                    10, 20, new BigDecimal("1500.00"), moneda, null, true, null));
            return this;
        }

        Archivo conCategoria(Long id, String nombre, TipoTransaccion tipo) {
            categorias.add(new CategoriaResponse(id, nombre, tipo, "dog", "#123456", true, true));
            return this;
        }

        Archivo conGasto(Long id, BigDecimal monto, String descripcion) {
            transacciones.add(new TransaccionResponse(id, CUENTA_ARCHIVO, "Nomina", null, null,
                    CATEGORIA_ARCHIVO, "Mascotas", "dog", "#123456", TipoTransaccion.GASTO, monto, null, null,
                    "MXN", null, LocalDate.of(2024, 3, 15), descripcion, null, false, null));
            return this;
        }

        Archivo conCashback() {
            transacciones.add(new TransaccionResponse(CASHBACK_ARCHIVO, CUENTA_ARCHIVO, "Nomina", null, null,
                    null, null, null, null, TipoTransaccion.INGRESO, new BigDecimal("25.00"), null, null,
                    "MXN", null, LocalDate.of(2024, 3, 20), "Cashback automatico", null, true, null));
            cashback = List.of(new RespaldoFinancieroResponse.CashbackRespaldo(CASHBACK_ARCHIVO, MOVIMIENTO_ARCHIVO));
            return this;
        }

        Archivo conPresupuesto(BigDecimal limite, int mes, int anio) {
            presupuestos.add(new RespaldoFinancieroResponse.PresupuestoRespaldo(
                    (long) (presupuestos.size() + 1), CATEGORIA_ARCHIVO, limite, "MXN", mes, anio));
            return this;
        }

        Archivo conRecurrencia(BigDecimal monto) {
            recurrencias.add(new PlantillaRecurrenteResponse(1L, CUENTA_ARCHIVO, "Nomina", CATEGORIA_ARCHIVO,
                    "Mascotas", TipoTransaccion.GASTO, monto, "MXN", "Corte", FrecuenciaRecurrencia.MENSUAL,
                    LocalDate.of(2024, 4, 1), true));
            return this;
        }

        Archivo conEvento(Long transaccionId, Instant fecha) {
            historial.add(new AuditoriaTransaccionResponse(1L, transaccionId, "CREAR", null,
                    transacciones.stream()
                            .filter(movimiento -> movimiento.id().equals(transaccionId))
                            .findFirst().orElse(null), fecha));
            return this;
        }

        Archivo conAsiento(BigDecimal monto) {
            asientos.add(new AsientoContableResponse(1L, MOVIMIENTO_ARCHIVO, "TRANSACCION", TipoTransaccion.GASTO,
                    LocalDate.of(2024, 3, 15), "Gasto en efectivo", null, FECHA_ASIENTO, List.of(
                    linea("5-1", "Gastos", monto, "MXN", LadoContable.DEBE, CUENTA_ARCHIVO, CATEGORIA_ARCHIVO),
                    linea("1-1", "Efectivo", monto, "MXN", LadoContable.HABER, CUENTA_ARCHIVO, null))));
            return this;
        }

        RespaldoFinancieroResponse build() {
            return new RespaldoFinancieroResponse(version, Instant.parse("2024-04-01T12:00:00Z"),
                    new PerfilResponse(999L, "Nombre del respaldo", "respaldo@example.com", "CLARO", "MXN"),
                    cuentas, categorias, presupuestos, recurrencias, historial, asientos, transacciones, cashback);
        }
    }
}
