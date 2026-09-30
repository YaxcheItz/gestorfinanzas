package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.PagoPareja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PagoParejaRepository extends JpaRepository<PagoPareja, Long> {

    List<PagoPareja> findByParejaIdOrderByFechaDescIdDesc(Long parejaId);

    Optional<PagoPareja> findByIdAndParejaId(Long id, Long parejaId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM PagoPareja p WHERE p.pareja.id = :parejaId")
    void deleteByParejaId(@Param("parejaId") Long parejaId);
}
