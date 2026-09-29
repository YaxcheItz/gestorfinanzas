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
    BigDecimal montoDestino,
    BigDecimal tasaCambio,
    String moneda,
    String monedaDestino,
    LocalDate fecha,
    String descripcion,
    String notas,
    boolean cashbackAutomatico,
    LocalDateTime fechaCreacion
) {
    public static TransaccionResponse fromEntity(Transaccion t) {
        return new TransaccionResponse(
            t.getId(),
            t.getCuenta() != null ? t.getCuenta().getId() : null,
            t.getCuenta() != null ? t.getCuenta().getNombre() : t.getCuentaNombreHistorico(),
            t.getCuentaDestino() != null ? t.getCuentaDestino().getId() : null,
            t.getCuentaDestino() != null ? t.getCuentaDestino().getNombre() : t.getCuentaDestinoNombreHistorico(),
            t.getCategoria() != null ? t.getCategoria().getId() : null,
            t.getCategoria() != null ? t.getCategoria().getNombre() : null,
            t.getCategoria() != null ? t.getCategoria().getIcono() : null,
            t.getCategoria() != null ? t.getCategoria().getColor() : null,
            t.getTipo(),
            t.getMonto(),
            t.getMontoDestino(),
            t.getTasaCambio(),
            t.getCuenta() != null ? t.getCuenta().getMoneda() : t.getCuentaMonedaHistorica(),
            t.getCuentaDestino() != null ? t.getCuentaDestino().getMoneda() : t.getCuentaDestinoMonedaHistorica(),
            t.getFecha(),
            t.getDescripcion(),
            t.getNotas(),
            t.getCashbackOrigen() != null,
            t.getFechaCreacion()
        );
    }
}
