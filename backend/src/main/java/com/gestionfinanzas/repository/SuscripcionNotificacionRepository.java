package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.SuscripcionNotificacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SuscripcionNotificacionRepository extends JpaRepository<SuscripcionNotificacion, Long> {
    List<SuscripcionNotificacion> findAllByUsuarioId(Long usuarioId);
    Optional<SuscripcionNotificacion> findByEndpoint(String endpoint);
    void deleteByEndpointAndUsuarioId(String endpoint, Long usuarioId);
    void deleteAllByUsuarioId(Long usuarioId);
    boolean existsByUsuarioId(Long usuarioId);
}
