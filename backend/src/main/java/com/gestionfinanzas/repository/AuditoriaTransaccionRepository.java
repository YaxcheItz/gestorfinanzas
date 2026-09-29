package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.AuditoriaTransaccion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.util.List;

public interface AuditoriaTransaccionRepository extends JpaRepository<AuditoriaTransaccion, Long> {
    @Modifying
    @Query(value = "UPDATE auditoria_transacciones SET fecha_evento = :fecha WHERE id = :id", nativeQuery = true)
    void restaurarFechaEvento(@Param("id") Long id, @Param("fecha") java.time.Instant fecha);

    Page<AuditoriaTransaccion> findByUsuarioIdOrderByFechaEventoDescIdDesc(Long usuarioId, Pageable pageable);
    List<AuditoriaTransaccion> findAllByUsuarioIdOrderByFechaEventoAscIdAsc(Long usuarioId);
}
