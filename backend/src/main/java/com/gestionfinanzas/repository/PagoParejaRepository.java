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

    @Modifying(flushAutomatically = true)
    @Query("UPDATE PagoPareja p SET p.pagador = :anonimo WHERE p.pagador.id = :id")
    void anonimizarPagador(@Param("id") Long id, @Param("anonimo") com.gestionfinanzas.model.entity.Usuario anonimo);
    @Modifying(flushAutomatically = true)
    @Query("UPDATE PagoPareja p SET p.beneficiario = :anonimo WHERE p.beneficiario.id = :id")
    void anonimizarBeneficiario(@Param("id") Long id, @Param("anonimo") com.gestionfinanzas.model.entity.Usuario anonimo);
    @Modifying(flushAutomatically = true)
    @Query("UPDATE PagoPareja p SET p.registradoPor = :anonimo WHERE p.registradoPor.id = :id")
    void anonimizarAutor(@Param("id") Long id, @Param("anonimo") com.gestionfinanzas.model.entity.Usuario anonimo);

    List<PagoPareja> findByParejaIdOrderByFechaDescIdDesc(Long parejaId);

    Optional<PagoPareja> findByIdAndParejaId(Long id, Long parejaId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM PagoPareja p WHERE p.pareja.id = :parejaId")
    void deleteByParejaId(@Param("parejaId") Long parejaId);
}
