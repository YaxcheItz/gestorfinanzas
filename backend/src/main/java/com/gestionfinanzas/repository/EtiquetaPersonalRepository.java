package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.EtiquetaPersonal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EtiquetaPersonalRepository extends JpaRepository<EtiquetaPersonal, Long> {
    List<EtiquetaPersonal> findByUsuarioIdOrderByNombreAsc(Long usuarioId);
    Optional<EtiquetaPersonal> findByIdAndUsuarioId(Long id, Long usuarioId);
    boolean existsByUsuarioIdAndNombre(Long usuarioId, String nombre);
}
