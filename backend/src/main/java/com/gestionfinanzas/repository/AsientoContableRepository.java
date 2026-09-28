package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.AsientoContable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AsientoContableRepository extends JpaRepository<AsientoContable, Long> {
    Page<AsientoContable> findByUsuarioIdOrderByFechaOperacionDescIdDesc(Long usuarioId, Pageable pageable);
    List<AsientoContable> findAllByUsuarioIdOrderByFechaOperacionAscIdAsc(Long usuarioId);
}
