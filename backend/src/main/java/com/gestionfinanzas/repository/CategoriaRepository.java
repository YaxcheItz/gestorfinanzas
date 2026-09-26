package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
    // Retorna tanto las categorías del usuario como las globales (usuario_id IS NULL)
    @Query("SELECT c FROM Categoria c WHERE c.activo = true AND (c.usuario.id = :usuarioId OR c.usuario IS NULL)")
    List<Categoria> findDisponiblesParaUsuario(@Param("usuarioId") Long usuarioId);

    @Query("SELECT c FROM Categoria c WHERE c.id = :id AND c.activo = true AND (c.usuario.id = :usuarioId OR c.usuario IS NULL)")
    Optional<Categoria> findAccessibleById(@Param("id") Long id, @Param("usuarioId") Long usuarioId);

    List<Categoria> findByUsuarioIdAndTipo(Long usuarioId, TipoTransaccion tipo);

    List<Categoria> findByUsuarioIdOrderByActivoDescNombreAsc(Long usuarioId);

    Optional<Categoria> findByIdAndUsuarioId(Long id, Long usuarioId);

    boolean existsByUsuarioIdAndTipoAndNombreIgnoreCase(Long usuarioId, TipoTransaccion tipo, String nombre);
}
