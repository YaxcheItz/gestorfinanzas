package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.Cuenta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CuentaRepository extends JpaRepository<Cuenta, Long> {
    List<Cuenta> findByUsuarioIdAndActivoTrue(Long usuarioId);
    Optional<Cuenta> findByIdAndUsuarioId(Long id, Long usuarioId);
}
