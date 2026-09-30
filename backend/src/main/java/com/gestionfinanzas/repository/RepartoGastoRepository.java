package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.RepartoGasto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RepartoGastoRepository extends JpaRepository<RepartoGasto, Long> {

    List<RepartoGasto> findByGastoIdOrderByIdAsc(Long gastoId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM RepartoGasto r WHERE r.gasto.id = :gastoId")
    void deleteByGastoId(@Param("gastoId") Long gastoId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM RepartoGasto r WHERE r.gasto.pareja.id = :parejaId")
    void deleteByParejaId(@Param("parejaId") Long parejaId);
}
