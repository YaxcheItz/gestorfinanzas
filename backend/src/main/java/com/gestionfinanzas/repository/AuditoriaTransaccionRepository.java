package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.AuditoriaTransaccion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.time.Instant;
import java.util.List;

public interface AuditoriaTransaccionRepository extends JpaRepository<AuditoriaTransaccion, Long> {
    @Modifying
    @Query("UPDATE AuditoriaTransaccion a SET a.fechaEvento = :fecha WHERE a.id = :id")
    void restaurarFechaEvento(@Param("id") Long id, @Param("fecha") Instant fecha);

    Page<AuditoriaTransaccion> findByUsuarioIdOrderByFechaEventoDescIdDesc(Long usuarioId, Pageable pageable);
    List<AuditoriaTransaccion> findAllByUsuarioIdOrderByFechaEventoAscIdAsc(Long usuarioId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM AuditoriaTransaccion a WHERE a.usuario.id = :usuarioId")
    void deleteByUsuarioId(@Param("usuarioId") Long usuarioId);
}
