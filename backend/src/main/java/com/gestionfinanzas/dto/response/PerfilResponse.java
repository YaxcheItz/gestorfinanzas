package com.gestionfinanzas.dto.response;

import com.gestionfinanzas.model.entity.Usuario;

public record PerfilResponse(
        Long id,
        String nombre,
        String email,
        String tema,
        String monedaPredeterminada,
        String telefono,
        boolean notificacionesWhatsapp,
        boolean ocultarMontos
) {
    public PerfilResponse(Long id, String nombre, String email, String tema, String monedaPredeterminada) {
        this(id, nombre, email, tema, monedaPredeterminada, null, false, false);
    }

    public static PerfilResponse fromEntity(Usuario usuario) {
        return new PerfilResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getEmail(),
                usuario.getTemaPreferido(),
                usuario.getMonedaPreferida(),
                usuario.getTelefono(),
                usuario.isNotificacionesWhatsapp(),
                usuario.isOcultarMontos()
        );
    }
}
