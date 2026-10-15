package com.gestionfinanzas.dto.response;

import java.util.List;

public record PresupuestoDetalleResponse(
        PresupuestoResponse presupuesto,
        List<TransaccionResponse> movimientos
) {
}
