package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.TokenRecuperacionPassword;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface TokenRecuperacionPasswordRepository extends JpaRepository<TokenRecuperacionPassword, Long> {
    Optional<TokenRecuperacionPassword> findFirstByUsuarioIdOrderByFechaCreacionDesc(Long usuarioId);
    Optional<TokenRecuperacionPassword> findByTokenHashAndUsadoFalseAndFechaExpiracionAfter(String tokenHash, Instant ahora);
    void deleteByUsuarioId(Long usuarioId);
}
