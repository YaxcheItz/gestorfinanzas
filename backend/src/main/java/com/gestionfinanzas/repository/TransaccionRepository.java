package com.gestionfinanzas.repository;

import com.gestionfinanzas.dto.response.DashboardGastoCategoriaResponse;
import com.gestionfinanzas.dto.response.DashboardMesTipoTotal;
import com.gestionfinanzas.dto.response.DashboardMonedaTotales;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransaccionRepository extends JpaRepository<Transaccion, Long>, JpaSpecificationExecutor<Transaccion> {

    Optional<Transaccion> findByIdAndUsuarioId(Long id, Long usuarioId);

    Optional<Transaccion> findByClientRequestId(UUID clientRequestId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Transaccion t WHERE t.id = :id AND t.usuario.id = :usuarioId")
    Optional<Transaccion> findByIdAndUsuarioIdForUpdate(
            @Param("id") Long id, @Param("usuarioId") Long usuarioId
    );

    List<Transaccion> findAllByUsuarioIdOrderByFechaAscIdAsc(Long usuarioId);

    List<Transaccion> findByCuentaIdOrCuentaDestinoId(Long cuentaId, Long cuentaDestinoId);

    boolean existsByCuentaIdOrCuentaDestinoId(Long cuentaId, Long cuentaDestinoId);

    boolean existsByCategoriaId(Long categoriaId);

    List<Transaccion> findTop10ByUsuarioIdOrderByFechaDescIdDesc(Long usuarioId);

    List<Transaccion> findTop10ByUsuarioIdAndFechaBetweenOrderByFechaDescIdDesc(
            Long usuarioId, LocalDate desde, LocalDate hasta
    );

    List<Transaccion> findByCuentaIdAndTipoAndFechaBetweenOrderByFechaAscIdAsc(
            Long cuentaId, TipoTransaccion tipo, LocalDate fechaInicio, LocalDate fechaFin
    );

    List<Transaccion> findByCuentaIdAndCashbackOrigenIsNotNullAndFechaBetweenOrderByFechaAscIdAsc(
            Long cuentaId, LocalDate fechaInicio, LocalDate fechaFin
    );

    Optional<Transaccion> findByCashbackOrigenId(Long cashbackOrigenId);

    /**
     * Transaccion se referencia a si misma por cashbackOrigen. Hay que anular esa referencia
     * antes del borrado en lote: si no, la llave foranea sigue apuntando a una fila existente
     * y PostgreSQL rechaza el DELETE.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Transaccion t SET t.cashbackOrigen = NULL WHERE t.usuario.id = :usuarioId")
    void desvincularCashbackDe(@Param("usuarioId") Long usuarioId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM Transaccion t WHERE t.usuario.id = :usuarioId")
    void deleteByUsuarioId(@Param("usuarioId") Long usuarioId);

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
           "LEFT JOIN t.cuenta cuenta " +
           "WHERE t.usuario.id = :usuarioId AND t.categoria.id = :categoriaId " +
           "AND t.tipo = com.gestionfinanzas.model.enums.TipoTransaccion.GASTO " +
           "AND COALESCE(cuenta.moneda, t.cuentaMonedaHistorica) = :moneda " +
           "AND t.fecha BETWEEN :inicio AND :fin")
    BigDecimal sumGastosPorUsuarioYCategoriaYPeriodo(
            @Param("usuarioId") Long usuarioId,
            @Param("categoriaId") Long categoriaId,
            @Param("moneda") String moneda,
            @Param("inicio") LocalDate inicio,
            @Param("fin") LocalDate fin
    );

    @Query("SELECT new com.gestionfinanzas.dto.response.DashboardGastoCategoriaResponse(" +
    "c.id, COALESCE(c.nombre, 'Sin categoría'), c.color, SUM(t.monto), COALESCE(cuenta.moneda, t.cuentaMonedaHistorica)) " +
    "FROM Transaccion t LEFT JOIN t.categoria c LEFT JOIN t.cuenta cuenta " +
           "WHERE t.usuario.id = :usuarioId AND t.tipo = :tipo " +
           "AND t.fecha BETWEEN :inicio AND :fin " +
    "GROUP BY c.id, c.nombre, c.color, COALESCE(cuenta.moneda, t.cuentaMonedaHistorica) ORDER BY SUM(t.monto) DESC")
    List<DashboardGastoCategoriaResponse> findGastosPorCategoria(
            @Param("usuarioId") Long usuarioId,
            @Param("tipo") TipoTransaccion tipo,
            @Param("inicio") LocalDate inicio,
            @Param("fin") LocalDate fin
    );

    @Query("SELECT new com.gestionfinanzas.dto.response.DashboardMesTipoTotal(" +
    "YEAR(t.fecha), MONTH(t.fecha), t.tipo, SUM(t.monto), COALESCE(cuenta.moneda, t.cuentaMonedaHistorica)) " +
    "FROM Transaccion t LEFT JOIN t.cuenta cuenta " +
           "WHERE t.usuario.id = :usuarioId AND t.tipo IN :tipos " +
           "AND t.fecha BETWEEN :inicio AND :fin " +
    "GROUP BY YEAR(t.fecha), MONTH(t.fecha), t.tipo, COALESCE(cuenta.moneda, t.cuentaMonedaHistorica)")
    List<DashboardMesTipoTotal> sumMontosPorUsuarioYTipoAgrupadosPorMes(
            @Param("usuarioId") Long usuarioId,
            @Param("tipos") List<TipoTransaccion> tipos,
            @Param("inicio") LocalDate inicio,
            @Param("fin") LocalDate fin
    );

    @Query("SELECT new com.gestionfinanzas.dto.response.DashboardMonedaTotales(" +
           "COALESCE(cuenta.moneda, t.cuentaMonedaHistorica), " +
           "COALESCE(SUM(CASE WHEN t.tipo = com.gestionfinanzas.model.enums.TipoTransaccion.INGRESO THEN t.monto ELSE 0 END), 0), " +
           "COALESCE(SUM(CASE WHEN t.tipo = com.gestionfinanzas.model.enums.TipoTransaccion.GASTO THEN t.monto ELSE 0 END), 0)) " +
           "FROM Transaccion t LEFT JOIN t.cuenta cuenta " +
           "WHERE t.usuario.id = :usuarioId AND t.fecha BETWEEN :inicio AND :fin " +
           "AND t.tipo IN (com.gestionfinanzas.model.enums.TipoTransaccion.INGRESO, com.gestionfinanzas.model.enums.TipoTransaccion.GASTO) " +
           "GROUP BY COALESCE(cuenta.moneda, t.cuentaMonedaHistorica)")
    List<DashboardMonedaTotales> findTotalesMensualesPorMoneda(
            @Param("usuarioId") Long usuarioId,
            @Param("inicio") LocalDate inicio,
            @Param("fin") LocalDate fin
    );
}
