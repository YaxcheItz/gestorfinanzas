package com.gestionfinanzas.dto.response;

import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.enums.TipoTransaccion;

public record CategoriaResponse(
    Long id,
    String nombre,
    TipoTransaccion tipo,
    String icono,
    String color,
    boolean esPersonalizada
) {
    public static CategoriaResponse fromEntity(Categoria categoria) {
        return new CategoriaResponse(
            categoria.getId(),
            categoria.getNombre(),
            categoria.getTipo(),
            categoria.getIcono(),
            categoria.getColor(),
            categoria.getUsuario() != null
        );
    }
}
