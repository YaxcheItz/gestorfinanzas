package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.GastoPareja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GastoParejaRepository extends JpaRepository<GastoPareja, Long> {

    List<GastoPareja> findByParejaIdOrderByFechaDescIdDesc(Long parejaId);

    Optional<GastoPareja> findByIdAndParejaId(Long id, Long parejaId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM GastoPareja g WHERE g.pareja.id = :parejaId")
    void deleteByParejaId(@Param("parejaId") Long parejaId);
}
