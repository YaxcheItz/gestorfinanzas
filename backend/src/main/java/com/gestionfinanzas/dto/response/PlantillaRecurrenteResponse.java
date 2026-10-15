package com.gestionfinanzas.dto.response;

import com.gestionfinanzas.model.entity.PlantillaRecurrente;
import com.gestionfinanzas.model.enums.FrecuenciaRecurrencia;
import com.gestionfinanzas.model.enums.TipoTransaccion;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PlantillaRecurrenteResponse(
        Long id,
        Long cuentaId,
        String cuentaNombre,
        Long categoriaId,
        String categoriaNombre,
        TipoTransaccion tipo,
        BigDecimal monto,
        String moneda,
        String notas,
        FrecuenciaRecurrencia frecuencia,
        LocalDate siguienteFecha,
        boolean activa,
        Integer cuotasTotales,
        Integer cuotasPagadas,
        LocalDate fechaAncla,
        BigDecimal montoPendiente,
        java.util.UUID compraMsiId,
    Long listaId,
    java.util.Set<String> etiquetas
) {
    public PlantillaRecurrenteResponse(Long id, Long cuentaId, String cuentaNombre,
            Long categoriaId, String categoriaNombre, TipoTransaccion tipo, BigDecimal monto,
            String moneda, String notas, FrecuenciaRecurrencia frecuencia, LocalDate siguienteFecha,
            boolean activa, Integer cuotasTotales, Integer cuotasPagadas, LocalDate fechaAncla,
            BigDecimal montoPendiente, java.util.UUID compraMsiId) {
        this(id, cuentaId, cuentaNombre, categoriaId, categoriaNombre, tipo, monto, moneda, notas, frecuencia,
                siguienteFecha, activa, cuotasTotales, cuotasPagadas, fechaAncla, montoPendiente, compraMsiId, null, java.util.Set.of());
    }
    public PlantillaRecurrenteResponse(Long id, Long cuentaId, String cuentaNombre,
            Long categoriaId, String categoriaNombre, TipoTransaccion tipo, BigDecimal monto,
            String moneda, String notas, FrecuenciaRecurrencia frecuencia, LocalDate siguienteFecha,
            boolean activa) {
        this(id, cuentaId, cuentaNombre, categoriaId, categoriaNombre, tipo, monto, moneda,
                notas, frecuencia, siguienteFecha, activa, null, null, null, null, null);
    }
    public static PlantillaRecurrenteResponse fromEntity(PlantillaRecurrente plantilla) {
        return new PlantillaRecurrenteResponse(
                plantilla.getId(),
                plantilla.getCuenta().getId(),
                plantilla.getCuenta().getNombre(),
                plantilla.getCategoria() != null ? plantilla.getCategoria().getId() : null,
                plantilla.getCategoria() != null ? plantilla.getCategoria().getNombre() : null,
                plantilla.getTipo(),
                plantilla.getMonto(),
                plantilla.getCuenta().getMoneda(),
                plantilla.getNotas(),
                plantilla.getFrecuencia(),
                plantilla.getSiguienteFecha(),
                plantilla.isActiva(),
                plantilla.getCuotasTotales(), plantilla.getCuotasPagadas(), plantilla.getFechaAncla(),
                plantilla.getMontoPendiente(), plantilla.getCompraMsiId(),
                plantilla.getLista() != null ? plantilla.getLista().getId() : null, new java.util.TreeSet<>(plantilla.getEtiquetas())
        );
    }
}
