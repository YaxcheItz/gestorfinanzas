package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.AsientoContable;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.time.LocalDate;

public interface AsientoContableRepository extends JpaRepository<AsientoContable, Long> {
    boolean existsByUsuarioIdAndTransaccionOrigenId(Long usuarioId, Long transaccionOrigenId);
    @Query("SELECT DISTINCT a.transaccionOrigenId FROM AsientoContable a WHERE a.usuario.id = :usuarioId")
    java.util.Set<Long> findTransaccionesContabilizadas(@Param("usuarioId") Long usuarioId);
    Page<AsientoContable> findByUsuarioIdOrderByFechaOperacionDescIdDesc(Long usuarioId, Pageable pageable);
    @Query("SELECT a FROM AsientoContable a WHERE a.usuario.id = :usuarioId " +
            "AND (:desde IS NULL OR a.fechaOperacion >= :desde) " +
            "AND (:hasta IS NULL OR a.fechaOperacion <= :hasta) " +
            "AND (:tipoEvento IS NULL OR a.tipoEvento = :tipoEvento) " +
            "AND (:tipoMovimiento IS NULL OR a.tipoMovimiento = :tipoMovimiento " +
            "OR (a.tipoMovimiento IS NULL AND EXISTS (SELECT t.id FROM Transaccion t " +
            "WHERE t.id = a.transaccionOrigenId AND t.tipo = :tipoMovimiento))) " +
            "AND (:cuentaId IS NULL OR EXISTS (SELECT l.id FROM LineaAsiento l " +
            "WHERE l.asiento = a AND l.cuentaFinancieraId = :cuentaId)) " +
            "ORDER BY a.fechaOperacion DESC, a.id DESC")
    Page<AsientoContable> buscarConFiltros(
            @Param("usuarioId") Long usuarioId,
            @Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta,
            @Param("tipoEvento") String tipoEvento,
            @Param("tipoMovimiento") TipoTransaccion tipoMovimiento,
            @Param("cuentaId") Long cuentaId,
            Pageable pageable
    );
    List<AsientoContable> findAllByUsuarioIdOrderByFechaOperacionAscIdAsc(Long usuarioId);
}
