package com.gestionfinanzas.dto.request;

import com.gestionfinanzas.model.enums.TipoTransaccion;
import org.springframework.format.annotation.DateTimeFormat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record TransaccionFiltroRequest(
        TipoTransaccion tipo,
        Long cuentaId,
        Long categoriaId,
        List<Long> categoriaIds,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate fechaInicio,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate fechaFin,
        String busqueda,
        Long id,
        BigDecimal montoMin,
        BigDecimal montoMax,
        Long listaId,
        List<String> etiquetas,
        Long autorId
) {
    public TransaccionFiltroRequest(TipoTransaccion tipo, Long cuentaId, Long categoriaId, List<Long> categoriaIds,
            LocalDate fechaInicio, LocalDate fechaFin, String busqueda, Long id, BigDecimal montoMin, BigDecimal montoMax) {
        this(tipo, cuentaId, categoriaId, categoriaIds, fechaInicio, fechaFin, busqueda, id, montoMin, montoMax, null, null, null);
    }
}
