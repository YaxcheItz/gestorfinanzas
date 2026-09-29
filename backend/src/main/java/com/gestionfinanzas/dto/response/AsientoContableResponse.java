package com.gestionfinanzas.dto.response;

import com.gestionfinanzas.model.entity.AsientoContable;
import com.gestionfinanzas.model.enums.TipoTransaccion;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record AsientoContableResponse(
        Long id,
        Long transaccionOrigenId,
        String tipoEvento,
        TipoTransaccion tipoMovimiento,
        LocalDate fechaOperacion,
        String descripcion,
        BigDecimal tasaCambio,
        LocalDateTime fechaCreacion,
        List<LineaAsientoResponse> lineas
) {
    public static AsientoContableResponse fromEntity(AsientoContable asiento) {
        return fromEntity(asiento, null);
    }

    public static AsientoContableResponse fromEntity(AsientoContable asiento, TipoTransaccion tipoInferido) {
        return new AsientoContableResponse(
                asiento.getId(),
                asiento.getTransaccionOrigenId(),
                asiento.getTipoEvento(),
                asiento.getTipoMovimiento() != null ? asiento.getTipoMovimiento() : tipoInferido,
                asiento.getFechaOperacion(),
                asiento.getDescripcion(),
                asiento.getTasaCambio(),
                asiento.getFechaCreacion(),
                asiento.getLineas().stream().map(LineaAsientoResponse::fromEntity).toList()
        );
    }
}
