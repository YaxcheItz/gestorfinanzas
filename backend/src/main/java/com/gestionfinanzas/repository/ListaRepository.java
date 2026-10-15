package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.ListaFinanciera;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.*;

public interface ListaRepository extends JpaRepository<ListaFinanciera, Long> {
    Optional<ListaFinanciera> findByPropietarioIdAndClave(Long usuarioId, String clave);
    List<ListaFinanciera> findByPropietarioId(Long usuarioId);
    @Query("select l from ListaFinanciera l where l.id in (select m.lista.id from ListaMiembro m where m.usuario.id = :usuarioId) order by l.id")
    List<ListaFinanciera> accesibles(Long usuarioId);
    long countByPropietarioId(Long usuarioId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from ListaFinanciera l where l.id = :id")
    Optional<ListaFinanciera> bloquear(Long id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from ListaFinanciera l where l.invitacionHash = :hash")
    Optional<ListaFinanciera> buscarInvitacion(String hash);
}
