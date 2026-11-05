package com.gestionfinanzas.dto.response;

import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.enums.TipoTransaccion;

public record CategoriaResponse(
    Long id,
    String nombre,
    TipoTransaccion tipo,
    String icono,
    String color,
    boolean esPersonalizada,
    boolean activo,
    boolean historica
) {
    public CategoriaResponse(Long id,String nombre,TipoTransaccion tipo,String icono,String color,boolean esPersonalizada,boolean activo) {
        this(id,nombre,tipo,icono,color,esPersonalizada,activo,false);
    }
    public static CategoriaResponse fromHistorica(com.gestionfinanzas.model.entity.CategoriaHistorica c) {
        return new CategoriaResponse(c.getId(),c.getNombre(),c.getTipo(),c.getIcono(),c.getColor(),true,false,true);
    }
    public static CategoriaResponse fromEntity(Categoria categoria) {
        return new CategoriaResponse(
            categoria.getId(),
            categoria.getNombre(),
            categoria.getTipo(),
            categoria.getIcono(),
            categoria.getColor(),
            categoria.getUsuario() != null,
            categoria.isActivo()
        );
    }
}
