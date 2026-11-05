package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.PlantillaRecurrente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PlantillaRecurrenteRepository extends JpaRepository<PlantillaRecurrente, Long> {
    List<PlantillaRecurrente> findAllByUsuarioIdOrderBySiguienteFechaAsc(Long usuarioId);
    List<PlantillaRecurrente> findByActivaTrueAndSiguienteFecha(java.time.LocalDate siguienteFecha);
    Optional<PlantillaRecurrente> findByIdAndUsuarioId(Long id, Long usuarioId);
    void deleteByCuentaId(Long cuentaId);
    boolean existsByCategoriaId(Long categoriaId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    List<PlantillaRecurrente> findAllByCategoriaId(Long categoriaId);
    long countByCategoriaId(Long categoriaId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM PlantillaRecurrente p WHERE p.usuario.id = :usuarioId")
    void deleteByUsuarioId(@Param("usuarioId") Long usuarioId);
}
