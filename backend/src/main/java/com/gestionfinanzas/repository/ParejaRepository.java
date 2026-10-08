package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.Pareja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParejaRepository extends JpaRepository<Pareja, Long> {

    interface Participantes {
        Long getUsuarioAId();
        Long getUsuarioBId();
    }

    @Query("SELECT p.usuarioA.id AS usuarioAId, p.usuarioB.id AS usuarioBId FROM Pareja p WHERE p.id = :id")
    Optional<Participantes> findParticipantes(@Param("id") Long id);

    @Query("SELECT p.id FROM Pareja p WHERE p.activa = true " +
            "AND (p.usuarioA.id = :usuarioId OR p.usuarioB.id = :usuarioId) ORDER BY p.id DESC")
    List<Long> findIdsActivasDeUsuario(@Param("usuarioId") Long usuarioId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Pareja p WHERE p.id = :id")
    Optional<Pareja> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT p FROM Pareja p WHERE p.pendiente = true AND " +
            "(p.usuarioA.id = :usuarioId OR p.usuarioB.id = :usuarioId) ORDER BY p.id DESC")
    List<Pareja> findPendientesDeUsuario(@Param("usuarioId") Long usuarioId);

    @Query("SELECT p FROM Pareja p WHERE p.activa = false AND p.pendiente = false " +
            "AND (p.usuarioA.id = :usuarioId OR p.usuarioB.id = :usuarioId) " +
            "AND (p.propietarioHistorialId IS NULL OR p.propietarioHistorialId = :usuarioId) " +
            "AND (p.fechaAceptacion IS NOT NULL OR p.propietarioHistorialId IS NOT NULL " +
            "OR EXISTS (SELECT a.id FROM AportacionPareja a WHERE a.pareja = p) " +
            "OR EXISTS (SELECT g.id FROM GastoPareja g WHERE g.pareja = p) " +
            "OR EXISTS (SELECT v.id FROM PagoPareja v WHERE v.pareja = p)) ORDER BY p.id DESC")
    List<Pareja> findHistorialDeUsuario(@Param("usuarioId") Long usuarioId);

    /**
     * La pareja activa del usuario, sea cual de los dos lados que lo guarde.
     * Se escribe a mano en vez de con un método derivado porque el filtro tiene
     * un OR entre dos relaciones distintas y conviene que se vea explícito.
     */
    @Query("SELECT p FROM Pareja p " +
           "WHERE p.activa = true AND (p.usuarioA.id = :usuarioId OR p.usuarioB.id = :usuarioId) " +
           "ORDER BY p.id DESC")
    List<Pareja> findActivaDeUsuario(@Param("usuarioId") Long usuarioId);

    @Query("SELECT COUNT(p) FROM Pareja p " +
           "WHERE p.activa = true AND (p.usuarioA.id = :usuarioId OR p.usuarioB.id = :usuarioId)")
    long contarActivasDeUsuario(@Param("usuarioId") Long usuarioId);

    /**
     * Solo los ids, incluidas las parejas ya desactivadas. Lo necesita el borrado
     * de cuenta, que tiene que limpiar también el historial de parejas antiguas.
     */
    @Query("SELECT p.id FROM Pareja p WHERE p.usuarioA.id = :usuarioId OR p.usuarioB.id = :usuarioId")
    List<Long> listarIdsDeUsuario(@Param("usuarioId") Long usuarioId);

    /**
     * Todas las parejas, incluidas las ya desvinculadas. El respaldo usa esta y
     * no la de la activa porque un historial que quedo guardado sigue siendo
     * historia del usuario y debe sobrevivir a una restauracion.
     */
    @Query("SELECT p FROM Pareja p " +
           "WHERE p.pendiente = false AND (p.usuarioA.id = :usuarioId OR p.usuarioB.id = :usuarioId) " +
           "AND (p.propietarioHistorialId IS NULL OR p.propietarioHistorialId = :usuarioId) " +
           "AND (p.activa = true OR p.fechaAceptacion IS NOT NULL OR p.propietarioHistorialId IS NOT NULL " +
           "OR EXISTS (SELECT a.id FROM AportacionPareja a WHERE a.pareja = p) " +
           "OR EXISTS (SELECT g.id FROM GastoPareja g WHERE g.pareja = p) " +
           "OR EXISTS (SELECT v.id FROM PagoPareja v WHERE v.pareja = p)) " +
           "ORDER BY p.id DESC")
    List<Pareja> findTodasDeUsuario(@Param("usuarioId") Long usuarioId);

    /**
     * No filtra por usuario: quien llama tiene que comprobar antes que el
     * usuario pertenece a la pareja, o el service se salta el aislamiento.
     */
    Optional<Pareja> findByIdAndActivaTrue(Long id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM Pareja p WHERE p.usuarioA.id = :usuarioId OR p.usuarioB.id = :usuarioId")
    void deleteByUsuarioId(@Param("usuarioId") Long usuarioId);
}
