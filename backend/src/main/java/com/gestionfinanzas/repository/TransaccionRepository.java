package com.gestionfinanzas.repository;

import com.gestionfinanzas.dto.response.DashboardGastoCategoriaResponse;
import com.gestionfinanzas.dto.response.DashboardMesTipoTotal;
import com.gestionfinanzas.dto.response.DashboardMonedaTotales;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransaccionRepository extends JpaRepository<Transaccion, Long>, JpaSpecificationExecutor<Transaccion> {

    Optional<Transaccion> findByIdAndUsuarioId(Long id, Long usuarioId);

    boolean existsByCuentaIdOrCuentaDestinoId(Long cuentaId, Long cuentaDestinoId);

    boolean existsByCategoriaId(Long categoriaId);

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
           "AND t.cuenta.moneda = :moneda " +
           "AND t.fecha BETWEEN :inicio AND :fin")
    BigDecimal sumGastosPorUsuarioYCategoriaYPeriodo(
            @Param("usuarioId") Long usuarioId,
            @Param("categoriaId") Long categoriaId,
            @Param("moneda") String moneda,
            @Param("inicio") LocalDate inicio,
            @Param("fin") LocalDate fin
    );

    @Query("SELECT new com.gestionfinanzas.dto.response.DashboardGastoCategoriaResponse(" +
           "c.id, COALESCE(c.nombre, 'Sin categoría'), c.color, SUM(t.monto), cuenta.moneda) " +
           "FROM Transaccion t LEFT JOIN t.categoria c JOIN t.cuenta cuenta " +
           "WHERE t.usuario.id = :usuarioId AND t.tipo = :tipo " +
           "AND t.fecha BETWEEN :inicio AND :fin " +
           "GROUP BY c.id, c.nombre, c.color, cuenta.moneda ORDER BY SUM(t.monto) DESC")
    List<DashboardGastoCategoriaResponse> findGastosPorCategoria(
            @Param("usuarioId") Long usuarioId,
            @Param("tipo") TipoTransaccion tipo,
            @Param("inicio") LocalDate inicio,
            @Param("fin") LocalDate fin
    );

    @Query("SELECT new com.gestionfinanzas.dto.response.DashboardMesTipoTotal(" +
           "YEAR(t.fecha), MONTH(t.fecha), t.tipo, SUM(t.monto), cuenta.moneda) " +
           "FROM Transaccion t JOIN t.cuenta cuenta " +
           "WHERE t.usuario.id = :usuarioId AND t.tipo IN :tipos " +
           "AND t.fecha BETWEEN :inicio AND :fin " +
           "GROUP BY YEAR(t.fecha), MONTH(t.fecha), t.tipo, cuenta.moneda")
    List<DashboardMesTipoTotal> sumMontosPorUsuarioYTipoAgrupadosPorMes(
            @Param("usuarioId") Long usuarioId,
            @Param("tipos") List<TipoTransaccion> tipos,
            @Param("inicio") LocalDate inicio,
            @Param("fin") LocalDate fin
    );

    @Query("SELECT new com.gestionfinanzas.dto.response.DashboardMonedaTotales(" +
           "cuenta.moneda, " +
           "COALESCE(SUM(CASE WHEN t.tipo = com.gestionfinanzas.model.enums.TipoTransaccion.INGRESO THEN t.monto ELSE 0 END), 0), " +
           "COALESCE(SUM(CASE WHEN t.tipo = com.gestionfinanzas.model.enums.TipoTransaccion.GASTO THEN t.monto ELSE 0 END), 0)) " +
           "FROM Transaccion t JOIN t.cuenta cuenta " +
           "WHERE t.usuario.id = :usuarioId AND t.fecha BETWEEN :inicio AND :fin " +
           "AND t.tipo IN (com.gestionfinanzas.model.enums.TipoTransaccion.INGRESO, com.gestionfinanzas.model.enums.TipoTransaccion.GASTO) " +
           "GROUP BY cuenta.moneda")
    List<DashboardMonedaTotales> findTotalesMensualesPorMoneda(
            @Param("usuarioId") Long usuarioId,
            @Param("inicio") LocalDate inicio,
            @Param("fin") LocalDate fin
    );
}
