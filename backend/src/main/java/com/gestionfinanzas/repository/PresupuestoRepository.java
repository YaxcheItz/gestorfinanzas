package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.Presupuesto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PresupuestoRepository extends JpaRepository<Presupuesto, Long> {
    List<Presupuesto> findByUsuarioIdAndMesAndAnio(Long usuarioId, int mes, int anio);
    List<Presupuesto> findAllByUsuarioIdOrderByAnioDescMesDescIdAsc(Long usuarioId);
    Optional<Presupuesto> findByUsuarioIdAndCategoriaIdAndMesAndAnio(Long usuarioId, Long categoriaId, int mes, int anio);
    Optional<Presupuesto> findByIdAndUsuarioId(Long id, Long usuarioId);
    boolean existsByCategoriaId(Long categoriaId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM Presupuesto p WHERE p.usuario.id = :usuarioId")
    void deleteByUsuarioId(@Param("usuarioId") Long usuarioId);
}
