package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.LineaAsiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LineaAsientoRepository extends JpaRepository<LineaAsiento, Long> {

    /**
     * Los borrados en lote de JPQL no disparan el CascadeType.ALL de AsientoContable hacia
     * sus lineas, asi que hay que borrarlas explicitamente antes que su asiento.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM LineaAsiento l WHERE l.asiento.usuario.id = :usuarioId")
    void deleteByUsuarioId(@Param("usuarioId") Long usuarioId);
}
