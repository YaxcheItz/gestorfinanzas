package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.ConexionWhatsapp;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.UUID;

public interface ConexionWhatsappRepository extends JpaRepository<ConexionWhatsapp,UUID> {
    Optional<ConexionWhatsapp> findByUsuarioId(Long usuarioId);
    boolean existsByTelefonoActivoHash(String hash);
    Optional<ConexionWhatsapp> findByTelefonoActivoHash(String hash);
    Optional<ConexionWhatsapp> findByDesafioHash(String hash);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from ConexionWhatsapp c where c.id=:id")
    Optional<ConexionWhatsapp> bloquearId(@Param("id") UUID id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from ConexionWhatsapp c where c.desafioHash=:hash")
    Optional<ConexionWhatsapp> bloquearDesafio(@Param("hash") String hash);
}
