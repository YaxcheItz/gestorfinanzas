package com.gestionfinanzas.dto.response;

import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.model.enums.MetodoCaptura;

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
    LocalDateTime fechaCreacion,
    MetodoCaptura metodoCaptura,
    java.util.UUID compraMsiId,
    Long listaId,
    String listaNombre,
    java.util.Set<String> etiquetas,
    Long autorId,
    String autorNombre,
    Long plantillaId,
    String fuenteCambio,
    LocalDate fechaCambio
) {
    public TransaccionResponse(Long id,
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
    LocalDateTime fechaCreacion,
    MetodoCaptura metodoCaptura,
    java.util.UUID compraMsiId,
    Long listaId,
    String listaNombre,
    java.util.Set<String> etiquetas,
    Long autorId,
    String autorNombre,
    Long plantillaId) {
        this(id, cuentaId, cuentaNombre, cuentaDestinoId, cuentaDestinoNombre, categoriaId, categoriaNombre, categoriaIcono, categoriaColor, tipo, monto, montoDestino, tasaCambio, moneda, monedaDestino, fecha, descripcion, notas, cashbackAutomatico, fechaCreacion, metodoCaptura, compraMsiId, listaId, listaNombre, etiquetas, autorId, autorNombre, plantillaId, null, null);
    }

    public TransaccionResponse(Long id, Long cuentaId, String cuentaNombre, Long cuentaDestinoId,
            String cuentaDestinoNombre, Long categoriaId, String categoriaNombre, String categoriaIcono,
            String categoriaColor, TipoTransaccion tipo, BigDecimal monto, BigDecimal montoDestino,
            BigDecimal tasaCambio, String moneda, String monedaDestino, LocalDate fecha,
            String descripcion, String notas, boolean cashbackAutomatico, LocalDateTime fechaCreacion,
            MetodoCaptura metodoCaptura, java.util.UUID compraMsiId) {
        this(id, cuentaId, cuentaNombre, cuentaDestinoId, cuentaDestinoNombre, categoriaId,
                categoriaNombre, categoriaIcono, categoriaColor, tipo, monto, montoDestino,
                tasaCambio, moneda, monedaDestino, fecha, descripcion, notas, cashbackAutomatico,
                fechaCreacion, metodoCaptura, compraMsiId, null, null, java.util.Set.of(), null, null, null);
    }
    public TransaccionResponse(Long id, Long cuentaId, String cuentaNombre, Long cuentaDestinoId,
            String cuentaDestinoNombre, Long categoriaId, String categoriaNombre, String categoriaIcono,
            String categoriaColor, TipoTransaccion tipo, BigDecimal monto, BigDecimal montoDestino,
            BigDecimal tasaCambio, String moneda, String monedaDestino, LocalDate fecha,
            String descripcion, String notas, boolean cashbackAutomatico, LocalDateTime fechaCreacion,
            MetodoCaptura metodoCaptura) {
        this(id, cuentaId, cuentaNombre, cuentaDestinoId, cuentaDestinoNombre, categoriaId,
                categoriaNombre, categoriaIcono, categoriaColor, tipo, monto, montoDestino,
                tasaCambio, moneda, monedaDestino, fecha, descripcion, notas, cashbackAutomatico,
                fechaCreacion, metodoCaptura, null);
    }
    // Compatibilidad con respaldos y consumidores anteriores: origen desconocido.
    public TransaccionResponse(Long id, Long cuentaId, String cuentaNombre, Long cuentaDestinoId,
            String cuentaDestinoNombre, Long categoriaId, String categoriaNombre, String categoriaIcono,
            String categoriaColor, TipoTransaccion tipo, BigDecimal monto, BigDecimal montoDestino,
            BigDecimal tasaCambio, String moneda, String monedaDestino, LocalDate fecha,
            String descripcion, String notas, boolean cashbackAutomatico, LocalDateTime fechaCreacion) {
        this(id, cuentaId, cuentaNombre, cuentaDestinoId, cuentaDestinoNombre, categoriaId,
                categoriaNombre, categoriaIcono, categoriaColor, tipo, monto, montoDestino,
                tasaCambio, moneda, monedaDestino, fecha, descripcion, notas, cashbackAutomatico,
                fechaCreacion, null);
    }
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
            t.getFechaCreacion(),
            t.getMetodoCaptura(),
            t.getCompraMsiId(),
            t.getLista() != null ? t.getLista().getId() : null,
            t.getLista() != null ? t.getLista().getNombre() : null,
            t.getEtiquetas() == null ? java.util.Set.of() : new java.util.TreeSet<>(t.getEtiquetas()),
            t.getUsuario() != null ? t.getUsuario().getId() : null,
            t.getUsuario() != null ? t.getUsuario().getNombre() : null,
            t.getPlantillaRecurrente() != null ? t.getPlantillaRecurrente().getId() : null,
            t.getFuenteCambio(), t.getFechaCambio()
        );
    }
}
