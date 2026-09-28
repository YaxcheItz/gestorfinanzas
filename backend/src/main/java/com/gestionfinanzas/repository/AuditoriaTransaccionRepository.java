package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.AuditoriaTransaccion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditoriaTransaccionRepository extends JpaRepository<AuditoriaTransaccion, Long> {
    Page<AuditoriaTransaccion> findByUsuarioIdOrderByFechaEventoDescIdDesc(Long usuarioId, Pageable pageable);
    List<AuditoriaTransaccion> findAllByUsuarioIdOrderByFechaEventoAscIdAsc(Long usuarioId);
}
