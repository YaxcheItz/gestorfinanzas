package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.VinculacionCanal;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.Optional;

public interface VinculacionCanalRepository extends JpaRepository<VinculacionCanal, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from VinculacionCanal v where v.hash = :hash")
    Optional<VinculacionCanal> bloquear(@Param("hash") String hash);
    void deleteByVenceBefore(Instant ahora);
}
