package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.response.CategoriaResponse;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CategoriaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoriaService {

    private final CategoriaRepository categoriaRepository;

    @Transactional(readOnly = true)
    public List<CategoriaResponse> listarCategorias(Long usuarioId) {
        return categoriaRepository.findDisponiblesParaUsuario(usuarioId)
                .stream()
                .map(CategoriaResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public Categoria obtenerCategoriaAccesible(Long categoriaId, Long usuarioId) {
        return categoriaRepository.findAccessibleById(categoriaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada o no accesible"));
    }
}
