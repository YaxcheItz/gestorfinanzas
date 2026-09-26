package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@DataJpaTest
@ActiveProfiles("test")
class TransaccionRepositoryAnalyticsTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private TransaccionRepository transaccionRepository;

    @Test
    void consultasDeAnaliticaAgrupanMontosSinIncluirOtrosUsuarios() {
        YearMonth mesActual = YearMonth.now();
        Usuario usuario = crearUsuario("actual@example.com");
        Usuario otroUsuario = crearUsuario("otro@example.com");
        Cuenta cuenta = crearCuenta(usuario);
        Cuenta otraCuenta = crearCuenta(otroUsuario);
        Categoria categoria = entityManager.persist(Categoria.builder()
                .usuario(usuario)
                .nombre("Comida")
                .tipo(TipoTransaccion.GASTO)
                .color("#10b981")
                .build());

        crearTransaccion(usuario, cuenta, categoria, TipoTransaccion.GASTO, "50.00", mesActual.atDay(2));
        crearTransaccion(usuario, cuenta, null, TipoTransaccion.GASTO, "20.00", mesActual.atDay(3));
        crearTransaccion(usuario, cuenta, null, TipoTransaccion.INGRESO, "100.00", mesActual.atDay(4));
        crearTransaccion(otroUsuario, otraCuenta, categoria, TipoTransaccion.GASTO, "999.00", mesActual.atDay(5));
        entityManager.flush();

        var gastos = transaccionRepository.findGastosPorCategoria(
                usuario.getId(), TipoTransaccion.GASTO, mesActual.atDay(1), mesActual.atEndOfMonth()
        );
        var totalesMensuales = transaccionRepository.sumMontosPorUsuarioYTipoAgrupadosPorMes(
                usuario.getId(),
                List.of(TipoTransaccion.INGRESO, TipoTransaccion.GASTO),
                mesActual.atDay(1),
                mesActual.atEndOfMonth()
        );

        assertEquals(2, gastos.size());
        assertEquals("Comida", gastos.get(0).categoriaNombre());
        assertEquals(new BigDecimal("50.00"), gastos.get(0).monto());
        assertEquals("Sin categoría", gastos.get(1).categoriaNombre());
        assertNull(gastos.get(1).categoriaId());
        assertEquals(new BigDecimal("20.00"), gastos.get(1).monto());
        assertEquals("MXN", gastos.get(0).moneda());
        assertEquals(2, totalesMensuales.size());
        assertEquals(new BigDecimal("100.00"), totalesMensuales.stream()
                .filter(total -> total.tipo() == TipoTransaccion.INGRESO)
                .findFirst().orElseThrow().monto());
        assertEquals(new BigDecimal("70.00"), totalesMensuales.stream()
                .filter(total -> total.tipo() == TipoTransaccion.GASTO)
                .findFirst().orElseThrow().monto());
    }

    private Usuario crearUsuario(String email) {
        return entityManager.persist(Usuario.builder()
                .nombre("Test")
                .email(email)
                .passwordHash("hash")
                .build());
    }

    private Cuenta crearCuenta(Usuario usuario) {
        return entityManager.persist(Cuenta.builder()
                .usuario(usuario)
                .nombre("Cuenta")
                .tipo(TipoCuenta.EFECTIVO)
                .build());
    }

    private void crearTransaccion(
            Usuario usuario,
            Cuenta cuenta,
            Categoria categoria,
            TipoTransaccion tipo,
            String monto,
            LocalDate fecha
    ) {
        entityManager.persist(Transaccion.builder()
                .usuario(usuario)
                .cuenta(cuenta)
                .categoria(categoria)
                .tipo(tipo)
                .monto(new BigDecimal(monto))
                .fecha(fecha)
                .descripcion("Movimiento de prueba")
                .build());
    }
}
