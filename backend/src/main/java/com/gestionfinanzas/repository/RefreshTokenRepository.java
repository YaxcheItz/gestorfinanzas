package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findByUsuarioId(Long usuarioId);

    void deleteByUsuarioId(Long usuarioId);

    /** Limpia los tokens vencidos o ya rotados para que la tabla no crezca sin control. */
    long deleteByFechaExpiracionBefore(Instant limite);
}
