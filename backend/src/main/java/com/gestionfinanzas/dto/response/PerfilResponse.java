package com.gestionfinanzas.dto.response;

import com.gestionfinanzas.model.entity.Usuario;

public record PerfilResponse(
        Long id,
        String nombre,
        String email,
        String tema,
        String monedaPredeterminada
) {
    public static PerfilResponse fromEntity(Usuario usuario) {
        return new PerfilResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getEmail(),
                usuario.getTemaPreferido(),
                usuario.getMonedaPreferida()
        );
    }
}
