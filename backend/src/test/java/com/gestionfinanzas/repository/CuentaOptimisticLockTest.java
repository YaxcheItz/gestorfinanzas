package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest
@ActiveProfiles("test")
class CuentaOptimisticLockTest {

    @Autowired
    private CuentaRepository cuentaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void rejectsUpdateWhenAccountWasChangedAfterItWasRead() {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        Long cuentaId = transaction.execute(status -> {
            Usuario usuario = usuarioRepository.save(Usuario.builder()
                    .nombre("Usuario")
                    .email("concurrencia@example.com")
                    .passwordHash("hash")
                    .build());
            Cuenta cuenta = cuentaRepository.saveAndFlush(Cuenta.builder()
                    .usuario(usuario)
                    .nombre("Efectivo")
                    .tipo(TipoCuenta.EFECTIVO)
                    .build());
            return cuenta.getId();
        });

        Cuenta snapshotAnterior = transaction.execute(status -> cuentaRepository.findById(cuentaId).orElseThrow());

        transaction.executeWithoutResult(status -> {
            Cuenta cuentaActual = cuentaRepository.findById(cuentaId).orElseThrow();
            cuentaActual.setNombre("Efectivo actualizado");
            cuentaRepository.saveAndFlush(cuentaActual);
        });

        assertThrows(
                OptimisticLockingFailureException.class,
                () -> transaction.executeWithoutResult(status -> {
                    snapshotAnterior.setNombre("Actualización obsoleta");
                    cuentaRepository.saveAndFlush(snapshotAnterior);
                })
        );
    }

    @Test
    void optimisticLockConflictsReturnHttpConflict() {
        var response = new GlobalExceptionHandler().handleOptimisticLockingFailure(
                new OptimisticLockingFailureException("stale account version") {}
        );

        assertEquals(409, response.getStatusCode().value());
        assertEquals(false, response.getBody().success());
    }
}
