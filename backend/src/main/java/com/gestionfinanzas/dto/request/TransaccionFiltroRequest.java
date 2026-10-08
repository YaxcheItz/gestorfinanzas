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
        BigDecimal montoMax
) {
}
