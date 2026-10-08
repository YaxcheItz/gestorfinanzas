package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.AportacionPareja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AportacionParejaRepository extends JpaRepository<AportacionPareja, Long> {

    @Modifying(flushAutomatically = true)
    @Query("UPDATE AportacionPareja a SET a.usuario = :anonimo WHERE a.usuario.id = :id")
    void anonimizarUsuario(@Param("id") Long id, @Param("anonimo") com.gestionfinanzas.model.entity.Usuario anonimo);

    List<AportacionPareja> findByParejaIdOrderByFechaDescIdDesc(Long parejaId);

    Optional<AportacionPareja> findByIdAndParejaId(Long id, Long parejaId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM AportacionPareja a WHERE a.pareja.id = :parejaId")
    void deleteByParejaId(@Param("parejaId") Long parejaId);
}
