package com.gestionfinanzas.repository;

import com.gestionfinanzas.model.entity.ListaMiembro;
import org.springframework.data.jpa.repository.*;
import java.util.*;

public interface ListaMiembroRepository extends JpaRepository<ListaMiembro, Long> {
    Optional<ListaMiembro> findByListaIdAndUsuarioId(Long listaId, Long usuarioId);
    List<ListaMiembro> findByUsuarioIdOrderByIdAsc(Long usuarioId);
    List<ListaMiembro> findByListaIdOrderByIdAsc(Long listaId);
    long countByListaId(Long listaId);
    void deleteByUsuarioId(Long usuarioId);
    void deleteByListaId(Long listaId);
}
