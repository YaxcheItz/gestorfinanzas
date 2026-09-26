package com.gestionfinanzas.dto.response;

import com.gestionfinanzas.model.entity.Presupuesto;

import java.math.BigDecimal;

public record PresupuestoResponse(
        Long id,
        Long categoriaId,
        String categoriaNombre,
        String categoriaIcono,
        String categoriaColor,
        BigDecimal montoLimite,
        String moneda,
        BigDecimal montoGastado,
        BigDecimal montoDisponible,
        BigDecimal porcentajeConsumido,
        int mes,
        int anio,
        String estado
) {
    public static PresupuestoResponse of(
            Presupuesto presupuesto,
            BigDecimal montoGastado,
            BigDecimal montoDisponible,
            BigDecimal porcentajeConsumido,
            String estado
    ) {
        return new PresupuestoResponse(
                presupuesto.getId(),
                presupuesto.getCategoria().getId(),
                presupuesto.getCategoria().getNombre(),
                presupuesto.getCategoria().getIcono(),
                presupuesto.getCategoria().getColor(),
                presupuesto.getMontoLimite(),
                presupuesto.getMoneda(),
                montoGastado,
                montoDisponible,
                porcentajeConsumido,
                presupuesto.getMes(),
                presupuesto.getAnio(),
                estado
        );
    }
}
