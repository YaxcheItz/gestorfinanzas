package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.EliminarUsuarioRequest;
import com.gestionfinanzas.model.entity.AportacionPareja;
import com.gestionfinanzas.model.entity.AsientoContable;
import com.gestionfinanzas.model.entity.AuditoriaTransaccion;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.GastoPareja;
import com.gestionfinanzas.model.entity.LineaAsiento;
import com.gestionfinanzas.model.entity.PagoPareja;
import com.gestionfinanzas.model.entity.Pareja;
import com.gestionfinanzas.model.entity.PlantillaRecurrente;
import com.gestionfinanzas.model.entity.Presupuesto;
import com.gestionfinanzas.model.entity.RepartoGasto;
import com.gestionfinanzas.model.entity.TokenRecuperacionPassword;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.FrecuenciaRecurrencia;
import com.gestionfinanzas.model.enums.LadoContable;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.TipoReparto;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.AportacionParejaRepository;
import com.gestionfinanzas.repository.AsientoContableRepository;
import com.gestionfinanzas.repository.AuditoriaTransaccionRepository;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.GastoParejaRepository;
import com.gestionfinanzas.repository.LineaAsientoRepository;
import com.gestionfinanzas.repository.PagoParejaRepository;
import com.gestionfinanzas.repository.ParejaRepository;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
import com.gestionfinanzas.repository.PresupuestoRepository;
import com.gestionfinanzas.repository.RepartoGastoRepository;
import com.gestionfinanzas.repository.TokenRecuperacionPasswordRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Comprueba el borrado contra una base de datos real, porque lo unico que puede fallar aqui
 * es el orden: las llaves foraneas se validan de verdad en H2 modo PostgreSQL. Un test con
 * mocks pasaria aunque el orden fuera incorrecto.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UsuarioServiceBorradoIntegrationTest {

    private static final String PASSWORD = "Password123";

    @Autowired private UsuarioService usuarioService;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private LineaAsientoRepository lineaAsientoRepository;
    @Autowired private AsientoContableRepository asientoContableRepository;
    @Autowired private AuditoriaTransaccionRepository auditoriaRepository;
    @Autowired private TransaccionRepository transaccionRepository;
    @Autowired private PlantillaRecurrenteRepository plantillaRepository;
    @Autowired private PresupuestoRepository presupuestoRepository;
    @Autowired private TokenRecuperacionPasswordRepository tokenRecuperacionRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private CuentaRepository cuentaRepository;
    @Autowired private ParejaRepository parejaRepository;
    @Autowired private AportacionParejaRepository aportacionRepository;
    @Autowired private GastoParejaRepository gastoRepository;
    @Autowired private RepartoGastoRepository repartoRepository;
    @Autowired private PagoParejaRepository pagoRepository;

    @Test
    void eliminaLaCuentaYTodosSusDatosSinViolarLlavesForaneas() {
        Usuario usuario = crearUsuario("ana@example.com");
        Categoria categoria = crearCategoria(usuario, "Comida");
        Cuenta cuenta = crearCuenta(usuario, "Oro");
        Transaccion origen = crearTransaccion(usuario, cuenta, categoria, "Compra tienda");
        Transaccion cashback = crearTransaccion(usuario, cuenta, categoria, "Cashback");
        cashback.setCashbackOrigen(origen);
        transaccionRepository.saveAndFlush(cashback);

        AsientoContable asiento = AsientoContable.builder()
                .usuario(usuario)
                .transaccionOrigenId(origen.getId())
                .tipoEvento("TRANSACCION")
                .fechaOperacion(LocalDate.now())
                .descripcion("Compra tienda")
                .fechaCreacion(LocalDateTime.now())
                .build();
        LineaAsiento linea = LineaAsiento.builder()
                .asiento(asiento)
                .codigoCuenta("1001")
                .nombreCuenta("Oro")
                .monto(new BigDecimal("250.00"))
                .moneda("MXN")
                .lado(LadoContable.DEBE)
                .build();
        asiento.getLineas().add(linea);
        asientoContableRepository.saveAndFlush(asiento);

        auditoriaRepository.saveAndFlush(AuditoriaTransaccion.builder()
                .usuario(usuario)
                .transaccionId(origen.getId())
                .accion("CREAR")
                .fechaEvento(Instant.now())
                .build());

        plantillaRepository.saveAndFlush(PlantillaRecurrente.builder()
                .usuario(usuario)
                .cuenta(cuenta)
                .categoria(categoria)
                .tipo(TipoTransaccion.GASTO)
                .monto(new BigDecimal("150.00"))
                .frecuencia(FrecuenciaRecurrencia.MENSUAL)
                .siguienteFecha(LocalDate.now().plusDays(1))
                .build());

        presupuestoRepository.saveAndFlush(Presupuesto.builder()
                .usuario(usuario)
                .categoria(categoria)
                .montoLimite(new BigDecimal("3000.00"))
                .mes(5)
                .anio(2026)
                .build());

        tokenRecuperacionRepository.saveAndFlush(TokenRecuperacionPassword.builder()
                .usuario(usuario)
                .tokenHash("hash-token")
                .fechaExpiracion(Instant.now().plusSeconds(3600))
                .fechaCreacion(Instant.now())
                .build());

        usuarioService.eliminarCuenta(usuario.getId(), new EliminarUsuarioRequest(PASSWORD));

        assertTrue(usuarioRepository.findById(usuario.getId()).isEmpty(), "el usuario debe quedar borrado");
        assertEquals(0, cuentaRepository.count(), "las cuentas del usuario deben borrarse");
        assertEquals(0, transaccionRepository.count(), "las transacciones deben borrarse");
        assertEquals(0, asientoContableRepository.count(), "los asientos contables deben borrarse");
        assertEquals(0, lineaAsientoRepository.count(), "las lineas de asiento deben borrarse en cascada");
        assertEquals(0, auditoriaRepository.count(), "la auditoria debe borrarse");
        assertEquals(0, presupuestoRepository.count(), "los presupuestos deben borrarse");
        assertEquals(0, plantillaRepository.count(), "las plantillas recurrentes deben borrarse");
        assertEquals(0, tokenRecuperacionRepository.count(), "los tokens de recuperacion deben borrarse");
    }

    @Test
    void conservaLasCategoriasGlobalesYLoDeOtrosUsuarios() {
        Usuario usuario = crearUsuario("ana@example.com");
        Usuario otro = crearUsuario("beto@example.com");
        Categoria global = categoriaRepository.saveAndFlush(Categoria.builder()
                .nombre("Global")
                .tipo(TipoTransaccion.GASTO)
                .build());
        Categoria propia = crearCategoria(usuario, "Comida");
        Categoria deOtro = crearCategoria(otro, "Transporte");
        Cuenta cuentaDeOtro = crearCuenta(otro, "Plata");

        usuarioService.eliminarCuenta(usuario.getId(), new EliminarUsuarioRequest(PASSWORD));

        assertTrue(categoriaRepository.findById(global.getId()).isPresent(),
                "las categorias globales no pertenecen a nadie y deben sobrevivir");
        assertTrue(categoriaRepository.findById(propia.getId()).isEmpty());
        assertTrue(categoriaRepository.findById(deOtro.getId()).isPresent(),
                "no se debe tocar la categoria de otro usuario");
        assertTrue(cuentaRepository.findById(cuentaDeOtro.getId()).isPresent(),
                "no se debe tocar la cuenta de otro usuario");
        assertTrue(usuarioRepository.findById(otro.getId()).isPresent());
    }

    @Test
    void conservaLosGastosCompartidosAnonimizadosSinViolarLlavesForaneas() {
        Usuario ana = crearUsuario("ana@example.com");
        Usuario luis = crearUsuario("luis@example.com");

        Pareja pareja = parejaRepository.saveAndFlush(Pareja.builder()
                .usuarioA(ana).usuarioB(luis).moneda("MXN").activa(true).build());
        AportacionPareja aporte = aportacionRepository.saveAndFlush(AportacionPareja.builder()
                .pareja(pareja).usuario(ana).monto(new BigDecimal("500.00"))
                .moneda("MXN").fecha(LocalDate.now()).build());
        GastoPareja gasto = gastoRepository.saveAndFlush(GastoPareja.builder()
                .pareja(pareja).pagadoPor(ana).monto(new BigDecimal("300.00"))
                .moneda("MXN").fecha(LocalDate.now()).descripcion("Cena").build());
        repartoRepository.saveAndFlush(RepartoGasto.builder()
                .gasto(gasto).usuario(ana).monto(new BigDecimal("150.00"))
                .tipo(TipoReparto.IGUAL).porcentaje(new BigDecimal("50.00")).build());
        repartoRepository.saveAndFlush(RepartoGasto.builder()
                .gasto(gasto).usuario(luis).monto(new BigDecimal("150.00"))
                .tipo(TipoReparto.IGUAL).porcentaje(new BigDecimal("50.00")).build());
        pagoRepository.saveAndFlush(PagoPareja.builder()
                .pareja(pareja).pagador(luis).beneficiario(ana).monto(new BigDecimal("150.00"))
                .moneda("MXN").fecha(LocalDate.now()).build());

        usuarioService.eliminarCuenta(ana.getId(), new EliminarUsuarioRequest(PASSWORD));

        assertTrue(usuarioRepository.findById(ana.getId()).isEmpty());
        assertEquals(1, parejaRepository.count(), "el historial de la otra persona debe conservarse");
        assertEquals(1, aportacionRepository.count());
        assertEquals(1, gastoRepository.count());
        assertEquals(2, repartoRepository.count());
        assertEquals(1, pagoRepository.count());
        Pareja archivada=parejaRepository.findById(pareja.getId()).orElseThrow();
        org.junit.jupiter.api.Assertions.assertFalse(archivada.isActiva());
        org.junit.jupiter.api.Assertions.assertFalse(archivada.getUsuarioA().isActivo());
        assertEquals("Cuenta eliminada",archivada.getUsuarioA().getNombre());
        assertTrue(usuarioRepository.findById(luis.getId()).isPresent(),
                "la cuenta de la pareja sobrevive aunque el vinculo se borre");
    }

    @Test
    void conContrasenaIncorrectaNoBorraNada() {
        Usuario usuario = crearUsuario("ana@example.com");
        Cuenta cuenta = crearCuenta(usuario, "Oro");

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> usuarioService.eliminarCuenta(usuario.getId(), new EliminarUsuarioRequest("ContrasenaMala1")));

        assertEquals("La contraseña es incorrecta", error.getMessage());
        assertTrue(usuarioRepository.findById(usuario.getId()).isPresent());
        assertTrue(cuentaRepository.findById(cuenta.getId()).isPresent());
    }

    private Usuario crearUsuario(String email) {
        return usuarioRepository.saveAndFlush(Usuario.builder()
                .nombre("Usuario")
                .email(email)
                .passwordHash(passwordEncoder.encode(PASSWORD))
                .build());
    }

    private Categoria crearCategoria(Usuario usuario, String nombre) {
        return categoriaRepository.saveAndFlush(Categoria.builder()
                .usuario(usuario)
                .nombre(nombre)
                .tipo(TipoTransaccion.GASTO)
                .build());
    }

    private Cuenta crearCuenta(Usuario usuario, String nombre) {
        return cuentaRepository.saveAndFlush(Cuenta.builder()
                .usuario(usuario)
                .nombre(nombre)
                .tipo(TipoCuenta.DEBITO)
                .saldoActual(new BigDecimal("1000.00"))
                .build());
    }

    private Transaccion crearTransaccion(Usuario usuario, Cuenta cuenta, Categoria categoria, String descripcion) {
        return transaccionRepository.saveAndFlush(Transaccion.builder()
                .usuario(usuario)
                .cuenta(cuenta)
                .categoria(categoria)
                .tipo(TipoTransaccion.GASTO)
                .monto(new BigDecimal("250.00"))
                .fecha(LocalDate.now())
                .descripcion(descripcion)
                .build());
    }
}
