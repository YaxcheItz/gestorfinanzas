package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.CuentaRequest;
import com.gestionfinanzas.dto.request.TransaccionRequest;
import com.gestionfinanzas.dto.response.CuentaResponse;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Reproduce el caso reportado con una tarjeta de credito: se crea con deuda, se intenta
 * deshacer el saldo inicial y despues se borra la cuenta.
 *
 * Corre contra H2 en modo PostgreSQL porque el borrado de una cuenta solo puede fallar por
 * el orden en que se validan las llaves foraneas, cosa que un test con mocks no comprobaria.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TarjetaCreditoSaldoInicialIntegrationTest {

    private static final String PASSWORD = "Password123";

    @Autowired private CuentaService cuentaService;
    @Autowired private TransaccionService transaccionService;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private CuentaRepository cuentaRepository;
    @Autowired private TransaccionRepository transaccionRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private EntityManager entityManager;

    @Test
    void laDeudaDeUnaTarjetaSeGuardaEnNegativo() {
        Usuario usuario = crearUsuario("ana@example.com");

        Cuenta tarjeta = crearTarjeta(usuario, new BigDecimal("100.00"));

        assertEquals(new BigDecimal("-100.00"), tarjeta.getSaldoActual(),
                "una deuda se guarda como saldo negativo");
    }

    @Test
    void deshacerElSaldoInicialDeUnaTarjetaDejaLaDeudaEnCero() {
        Usuario usuario = crearUsuario("ana@example.com");
        Cuenta tarjeta = crearTarjeta(usuario, new BigDecimal("100.00"));

        transaccionService.eliminarTransaccion(usuario.getId(), idDelSaldoInicial(tarjeta));

        assertEquals(new BigDecimal("0.00"), saldoDe(tarjeta),
                "deshacer el saldo inicial tiene que devolver la deuda a cero, no doblarla");
    }

    @Test
    void deshacerElSaldoInicialDeUnaCuentaDeDebitoTambienLlegaACero() {
        Usuario usuario = crearUsuario("ana@example.com");
        CuentaResponse creada = cuentaService.crearCuenta(usuario.getId(), new CuentaRequest(
                "Ahorro", TipoCuenta.DEBITO, null, null, null, null, null, null,
                new BigDecimal("500.00"), "MXN", null));
        Cuenta cuenta = cuentaRepository.findById(creada.id()).orElseThrow();

        transaccionService.eliminarTransaccion(usuario.getId(), idDelSaldoInicial(cuenta));

        assertEquals(new BigDecimal("0.00"), saldoDe(cuenta));
    }

    @Test
    void unaTarjetaSinDeudaSeBorraAunqueTengoMovimientos() {
        Usuario usuario = crearUsuario("ana@example.com");
        Cuenta tarjeta = crearTarjeta(usuario, new BigDecimal("100.00"));
        Categoria ingreso = crearCategoria(usuario, "Ingreso", TipoTransaccion.INGRESO);

        transaccionService.crearTransaccion(usuario.getId(), new TransaccionRequest(
                tarjeta.getId(), null, ingreso.getId(), TipoTransaccion.INGRESO,
                new BigDecimal("100.00"), null, LocalDate.now(), "Abono", null, null, null, null));
        entityManager.flush();
        entityManager.clear();

        // Es el estado en que el usuario reporto que no la podia borrar.
        assertEquals(new BigDecimal("0.00"), saldoDe(tarjeta));

        cuentaService.eliminarCuenta(usuario.getId(), tarjeta.getId());

        assertTrue(cuentaRepository.findById(tarjeta.getId()).isEmpty(),
                "la tarjeta debe borrarse: el historial se queda con el nombre historico");
        List<Transaccion> huerfanas = transaccionRepository
                .findByCuentaIdOrCuentaDestinoId(tarjeta.getId(), tarjeta.getId());
        assertTrue(huerfanas.isEmpty());
    }

    /**
     * Reproduce la ruta que quiso hacer el usuario: crear la tarjeta con deuda, deshacer el
     * saldo inicial y borrar la cuenta. Antes habia que compensar con un ingreso porque
     * deshacer doblaba la deuda; con el arreglo la cuenta queda en cero y se borra directo.
     */
    @Test
    void deshacerLaDeudaPermiteBorrarLaTarjetaSinCompensar() {
        Usuario usuario = crearUsuario("ana@example.com");
        Cuenta tarjeta = crearTarjeta(usuario, new BigDecimal("100.00"));

        transaccionService.eliminarTransaccion(usuario.getId(), idDelSaldoInicial(tarjeta));
        entityManager.flush();
        entityManager.clear();

        assertEquals(new BigDecimal("0.00"), saldoDe(tarjeta));

        cuentaService.eliminarCuenta(usuario.getId(), tarjeta.getId());

        assertTrue(cuentaRepository.findById(tarjeta.getId()).isEmpty());
    }

    private BigDecimal saldoDe(Cuenta cuenta) {
        entityManager.flush();
        entityManager.clear();
        return cuentaRepository.findById(cuenta.getId()).orElseThrow().getSaldoActual();
    }

    private Long idDelSaldoInicial(Cuenta cuenta) {
        List<Transaccion> movimientos =
                transaccionRepository.findByCuentaIdOrCuentaDestinoId(cuenta.getId(), cuenta.getId());
        return movimientos.stream()
                .filter(t -> t.getTipo() == TipoTransaccion.SALDO_INICIAL)
                .findFirst()
                .orElseThrow()
                .getId();
    }

    private Cuenta crearTarjeta(Usuario usuario, BigDecimal deuda) {
        CuentaResponse creada = cuentaService.crearCuenta(usuario.getId(), new CuentaRequest(
                "Banamex", TipoCuenta.CREDITO, "Banamex", null, null,
                new BigDecimal("5000.00"), 5, 20, deuda, "MXN", null));
        return cuentaRepository.findById(creada.id()).orElseThrow();
    }

    private Usuario crearUsuario(String email) {
        return usuarioRepository.saveAndFlush(Usuario.builder()
                .nombre("Usuario")
                .email(email)
                .passwordHash(passwordEncoder.encode(PASSWORD))
                .build());
    }

    private Categoria crearCategoria(Usuario usuario, String nombre, TipoTransaccion tipo) {
        return categoriaRepository.saveAndFlush(Categoria.builder()
                .usuario(usuario)
                .nombre(nombre)
                .tipo(tipo)
                .build());
    }
}
