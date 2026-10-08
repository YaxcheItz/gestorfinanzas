package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    // Solo el ID: no cargar un token que podría quedar obsoleto antes de adquirir el bloqueo.
    @Query("SELECT t.usuario.id FROM RefreshToken t WHERE t.tokenHash = :tokenHash")
    Optional<Long> findUsuarioIdByTokenHash(@Param("tokenHash") String tokenHash);

    List<RefreshToken> findByUsuarioId(Long usuarioId);

    void deleteByUsuarioId(Long usuarioId);

    /** La limpieza del usuario se realiza bajo el mismo bloqueo que la renovación. */
    long deleteByUsuarioIdAndFechaExpiracionBefore(Long usuarioId, Instant limite);
}
