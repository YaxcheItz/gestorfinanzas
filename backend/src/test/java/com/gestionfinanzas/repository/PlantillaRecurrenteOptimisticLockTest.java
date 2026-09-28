package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.PlantillaRecurrente;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.FrecuenciaRecurrencia;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertThrows;

@DataJpaTest
@ActiveProfiles("test")
class PlantillaRecurrenteOptimisticLockTest {

    @Autowired
    private PlantillaRecurrenteRepository plantillaRepository;

    @Autowired
    private CuentaRepository cuentaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void soloUnaConfirmacionConcurrentePuedeAvanzarLaFechaRecurrente() {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        Long plantillaId = transaction.execute(status -> {
            Usuario usuario = usuarioRepository.save(Usuario.builder()
                    .nombre("Usuario")
                    .email("recurrencia-concurrencia@example.com")
                    .passwordHash("hash")
                    .build());
            Cuenta cuenta = cuentaRepository.save(Cuenta.builder()
                    .usuario(usuario)
                    .nombre("Efectivo")
                    .tipo(TipoCuenta.EFECTIVO)
                    .moneda("MXN")
                    .build());
            return plantillaRepository.saveAndFlush(PlantillaRecurrente.builder()
                    .usuario(usuario)
                    .cuenta(cuenta)
                    .tipo(TipoTransaccion.GASTO)
                    .monto(new BigDecimal("100.00"))
                    .frecuencia(FrecuenciaRecurrencia.MENSUAL)
                    .siguienteFecha(LocalDate.of(2025, 1, 1))
                    .activa(true)
                    .build()).getId();
        });

        PlantillaRecurrente lecturaAnterior = transaction.execute(
                status -> plantillaRepository.findById(plantillaId).orElseThrow()
        );
        transaction.executeWithoutResult(status -> {
            PlantillaRecurrente actual = plantillaRepository.findById(plantillaId).orElseThrow();
            actual.setSiguienteFecha(LocalDate.of(2025, 2, 1));
            plantillaRepository.saveAndFlush(actual);
        });

        assertThrows(OptimisticLockingFailureException.class, () ->
                transaction.executeWithoutResult(status -> {
                    lecturaAnterior.setSiguienteFecha(LocalDate.of(2025, 2, 1));
                    plantillaRepository.saveAndFlush(lecturaAnterior);
                }));
    }
}
