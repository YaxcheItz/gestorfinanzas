package com.gestionfinanzas.repository;
import com.gestionfinanzas.model.entity.CategoriaHistorica;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CategoriaHistoricaRepository extends JpaRepository<CategoriaHistorica,Long> {
 List<CategoriaHistorica> findByUsuarioIdOrderByIdAsc(Long usuarioId);
 void deleteByUsuarioId(Long usuarioId);
}
