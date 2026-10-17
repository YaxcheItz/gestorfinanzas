package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.AvisoFinanciero;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface AvisoFinancieroRepository extends JpaRepository<AvisoFinanciero,String> {
    boolean existsByUsuarioIdAndEstado(Long usuarioId,String estado);
    Optional<AvisoFinanciero> findByUsuarioIdAndOrigenAndIdentificadorHash(Long usuarioId,String origen,String identificadorHash);
    Page<AvisoFinanciero> findByUsuarioIdAndEstado(Long usuarioId,String estado,Pageable pageable);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from AvisoFinanciero a where a.id=:id and a.usuario.id=:usuario")
    Optional<AvisoFinanciero> bloquear(@Param("id") String id,@Param("usuario") Long usuario);
}
