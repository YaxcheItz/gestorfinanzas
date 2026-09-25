package com.gestionfinanzas.dto.response;

import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.enums.TipoTransaccion;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record TransaccionResponse(
    Long id,
    Long cuentaId,
    String cuentaNombre,
    Long cuentaDestinoId,
    String cuentaDestinoNombre,
    Long categoriaId,
    String categoriaNombre,
    String categoriaIcono,
    String categoriaColor,
    TipoTransaccion tipo,
    BigDecimal monto,
    LocalDate fecha,
    String descripcion,
    String notas,
    LocalDateTime fechaCreacion
) {
    public static TransaccionResponse fromEntity(Transaccion t) {
        return new TransaccionResponse(
            t.getId(),
            t.getCuenta().getId(),
            t.getCuenta().getNombre(),
            t.getCuentaDestino() != null ? t.getCuentaDestino().getId() : null,
            t.getCuentaDestino() != null ? t.getCuentaDestino().getNombre() : null,
            t.getCategoria() != null ? t.getCategoria().getId() : null,
            t.getCategoria() != null ? t.getCategoria().getNombre() : null,
            t.getCategoria() != null ? t.getCategoria().getIcono() : null,
            t.getCategoria() != null ? t.getCategoria().getColor() : null,
            t.getTipo(),
            t.getMonto(),
            t.getFecha(),
            t.getDescripcion(),
            t.getNotas(),
            t.getFechaCreacion()
        );
    }
}
