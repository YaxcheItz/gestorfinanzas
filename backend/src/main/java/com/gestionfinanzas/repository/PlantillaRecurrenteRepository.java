package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.PlantillaRecurrente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlantillaRecurrenteRepository extends JpaRepository<PlantillaRecurrente, Long> {
    List<PlantillaRecurrente> findAllByUsuarioIdOrderBySiguienteFechaAsc(Long usuarioId);
    Optional<PlantillaRecurrente> findByIdAndUsuarioId(Long id, Long usuarioId);
}
