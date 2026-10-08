package com.gestionfinanzas.dto.response;

import com.gestionfinanzas.model.entity.Pareja;
import java.time.LocalDateTime;

/** Una invitación muestra quién invita, sin movimientos ni saldos compartidos. */
public record InvitacionParejaResponse(Long id, String remitenteNombre, String remitenteEmail,
        String destinatarioEmail, String moneda, boolean recibida, LocalDateTime fechaCreacion) {
    public static InvitacionParejaResponse fromEntity(Pareja p, Long usuarioId) {
        return new InvitacionParejaResponse(p.getId(),
                p.getNombreRemitenteInvitacion() == null ? "Persona que te invita" : p.getNombreRemitenteInvitacion(),
                p.getCorreoRemitenteInvitacion() == null ? "" : p.getCorreoRemitenteInvitacion(),
                p.getCorreoDestinatarioInvitacion() == null ? "" : p.getCorreoDestinatarioInvitacion(),
                p.getMoneda(),p.getUsuarioB().getId().equals(usuarioId),p.getFechaCreacion());
    }
}
