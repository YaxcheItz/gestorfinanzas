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
    Optional<Presupuesto> findByUsuarioIdAndCategoriaIdAndMesAndAnioAndListaId(Long usuarioId, Long categoriaId, int mes, int anio, Long listaId);
    Optional<Presupuesto> findByUsuarioIdAndCategoriaIdAndMesAndAnioAndListaIsNull(Long usuarioId, Long categoriaId, int mes, int anio);

    @Query("SELECT p FROM Presupuesto p WHERE p.usuario.id = :usuarioId AND (:listaId IS NULL OR p.lista.id = :listaId) AND p.mes = :mes AND p.anio = :anio ORDER BY p.categoria.nombre ASC")
    List<Presupuesto> findByUsuarioIdAndFiltroListaAndMesAndAnio(
            @Param("usuarioId") Long usuarioId,
            @Param("listaId") Long listaId,
            @Param("mes") int mes,
            @Param("anio") int anio
    );

    @Query("SELECT p FROM Presupuesto p WHERE p.usuario.id = :usuarioId AND p.categoria.id = :categoriaId AND ((:listaId IS NULL AND p.lista IS NULL) OR p.lista.id = :listaId) AND p.mes = :mes AND p.anio = :anio")
    List<Presupuesto> findCandidatosParaDisponible(
            @Param("usuarioId") Long usuarioId,
            @Param("categoriaId") Long categoriaId,
            @Param("listaId") Long listaId,
            @Param("mes") int mes,
            @Param("anio") int anio
    );

    Optional<Presupuesto> findByIdAndUsuarioId(Long id, Long usuarioId);
    boolean existsByCategoriaId(Long categoriaId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM Presupuesto p WHERE p.usuario.id = :usuarioId")
    void deleteByUsuarioId(@Param("usuarioId") Long usuarioId);
}
