package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.PropuestaChat;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import java.time.Instant;
import java.util.*;

public interface PropuestaChatRepository extends JpaRepository<PropuestaChat,String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PropuestaChat p where p.id=:id and p.usuario.id=:usuarioId")
    Optional<PropuestaChat> bloquear(String id, Long usuarioId);
    List<PropuestaChat> findByUsuarioIdAndCompletadaFalseAndDescartadaFalseAndVenceAfterOrderByVenceAsc(Long usuarioId, Instant ahora);
    @Modifying @Query("delete from PropuestaChat p where p.usuario.id=:usuarioId")
    void eliminarDeUsuario(Long usuarioId);
}
