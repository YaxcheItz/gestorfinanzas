package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransaccionRepository extends JpaRepository<Transaccion, Long> {

    Optional<Transaccion> findByIdAndUsuarioId(Long id, Long usuarioId);

    List<Transaccion> findTop10ByUsuarioIdOrderByFechaDescIdDesc(Long usuarioId);

    Page<Transaccion> findByUsuarioIdOrderByFechaDesc(Long usuarioId, Pageable pageable);

    List<Transaccion> findByUsuarioIdAndFechaBetweenOrderByFechaDesc(
            Long usuarioId, LocalDate fechaInicio, LocalDate fechaFin
    );

    @Query("SELECT COALESCE(SUM(t.monto), 0) FROM Transaccion t " +
           "WHERE t.usuario.id = :usuarioId AND t.tipo = :tipo AND t.fecha BETWEEN :inicio AND :fin")
    BigDecimal sumMontoPorUsuarioYTipoYPeriodo(
            @Param("usuarioId") Long usuarioId,
            @Param("tipo") TipoTransaccion tipo,
            @Param("inicio") LocalDate inicio,
            @Param("fin") LocalDate fin
    );

    @Query("SELECT COALESCE(SUM(t.monto), 0) FROM Transaccion t " +
           "WHERE t.usuario.id = :usuarioId AND t.categoria.id = :categoriaId " +
           "AND t.tipo = com.gestionfinanzas.model.enums.TipoTransaccion.GASTO " +
           "AND t.fecha BETWEEN :inicio AND :fin")
    BigDecimal sumGastosPorUsuarioYCategoriaYPeriodo(
            @Param("usuarioId") Long usuarioId,
            @Param("categoriaId") Long categoriaId,
            @Param("inicio") LocalDate inicio,
            @Param("fin") LocalDate fin
    );
}
