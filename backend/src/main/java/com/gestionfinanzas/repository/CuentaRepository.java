package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.enums.TipoCuenta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CuentaRepository extends JpaRepository<Cuenta, Long> {
    List<Cuenta> findByUsuarioIdAndActivoTrue(Long usuarioId);
    List<Cuenta> findByUsuarioIdOrderByActivoDescNombreAsc(Long usuarioId);
    Optional<Cuenta> findByIdAndUsuarioId(Long id, Long usuarioId);
    boolean existsByUsuarioIdAndNombreIgnoreCase(Long usuarioId, String nombre);
    boolean existsByUsuarioIdAndTipo(Long usuarioId, TipoCuenta tipo);

    /** Carga las cuentas activas por tipo con JOIN FETCH del usuario para evitar LazyInitializationException en tareas @Scheduled */
    @Query("SELECT c FROM Cuenta c JOIN FETCH c.usuario WHERE c.activo = true AND c.tipo = :tipo")
    List<Cuenta> findActivasConUsuarioPorTipo(@Param("tipo") TipoCuenta tipo);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM Cuenta c WHERE c.usuario.id = :usuarioId")
    void deleteByUsuarioId(@Param("usuarioId") Long usuarioId);
}
