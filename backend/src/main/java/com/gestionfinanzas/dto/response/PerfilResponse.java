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
        boolean ocultarMontos,
        com.gestionfinanzas.service.PeriodoFinanciero.Config periodoPredeterminado
) {
    public PerfilResponse(Long id, String nombre, String email, String tema, String monedaPredeterminada) {
        this(id, nombre, email, tema, monedaPredeterminada, null, false, false, com.gestionfinanzas.service.PeriodoFinanciero.Config.mensual());
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
                usuario.isOcultarMontos(),
                new com.gestionfinanzas.service.PeriodoFinanciero.Config(usuario.getPeriodoTipo(), usuario.getPeriodoAncla(), usuario.getPeriodoDiaInicio(), usuario.getPeriodoDiaQuincena())
        );
    }
}
