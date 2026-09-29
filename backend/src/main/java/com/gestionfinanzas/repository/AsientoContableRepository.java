package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.AsientoContable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AsientoContableRepository extends JpaRepository<AsientoContable, Long> {
    boolean existsByUsuarioIdAndTransaccionOrigenId(Long usuarioId, Long transaccionOrigenId);
    @Query("SELECT DISTINCT a.transaccionOrigenId FROM AsientoContable a WHERE a.usuario.id = :usuarioId")
    java.util.Set<Long> findTransaccionesContabilizadas(@Param("usuarioId") Long usuarioId);
    Page<AsientoContable> findByUsuarioIdOrderByFechaOperacionDescIdDesc(Long usuarioId, Pageable pageable);
    List<AsientoContable> findAllByUsuarioIdOrderByFechaOperacionAscIdAsc(Long usuarioId);
}
