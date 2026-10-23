package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.ConexionAndroid;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConexionAndroidRepository extends JpaRepository<ConexionAndroid,String> {
    Optional<ConexionAndroid> findByUsuarioIdAndDispositivoId(Long usuarioId,String dispositivoId);
    Optional<ConexionAndroid> findByTokenHash(String tokenHash);
    long countByUsuarioId(Long usuarioId);
}
