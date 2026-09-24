package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.Presupuesto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PresupuestoRepository extends JpaRepository<Presupuesto, Long> {
    List<Presupuesto> findByUsuarioIdAndMesAndAnio(Long usuarioId, int mes, int anio);
    Optional<Presupuesto> findByUsuarioIdAndCategoriaIdAndMesAndAnio(Long usuarioId, Long categoriaId, int mes, int anio);
}
