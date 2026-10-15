package com.gestionfinanzas.dto.response;

import java.math.BigDecimal;

public record PresupuestoDisponibleResponse(
        Long categoriaId,
        String categoriaNombre,
        String categoriaIcono,
        String moneda,
        BigDecimal montoLimite,
        BigDecimal montoGastado,
        BigDecimal montoDisponible,
        BigDecimal porcentajeConsumido,
        Integer porcentajeAlerta,
        String estado,
        boolean tienePresupuesto,
        Long listaId,
        String listaNombre
) {
    public static PresupuestoDisponibleResponse sinPresupuesto(
            Long categoriaId,
            String categoriaNombre,
            String categoriaIcono,
            String moneda,
            Long listaId,
            String listaNombre
    ) {
        return new PresupuestoDisponibleResponse(
                categoriaId,
                categoriaNombre,
                categoriaIcono,
                moneda != null ? moneda : "MXN",
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                80,
                "SIN_PRESUPUESTO",
                false,
                listaId,
                listaNombre
        );
    }
}
