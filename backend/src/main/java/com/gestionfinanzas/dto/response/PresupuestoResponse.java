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
        String estado,
        Long listaId,
        String listaNombre,
        Integer porcentajeAlerta
) {
    public PresupuestoResponse(
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
        this(id, categoriaId, categoriaNombre, categoriaIcono, categoriaColor, montoLimite,
                moneda, montoGastado, montoDisponible, porcentajeConsumido, mes, anio, estado,
                null, null, 80);
    }

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
                estado,
                presupuesto.getLista() != null ? presupuesto.getLista().getId() : null,
                presupuesto.getLista() != null ? presupuesto.getLista().getNombre() : null,
                presupuesto.getPorcentajeAlerta() != null ? presupuesto.getPorcentajeAlerta() : 80
        );
    }
}
