package com.gestionfinanzas.dto.request;

import com.gestionfinanzas.model.enums.TipoTransaccion;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

public record TransaccionFiltroRequest(
        TipoTransaccion tipo,
        Long cuentaId,
        Long categoriaId,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate fechaInicio,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate fechaFin,
        String busqueda
) {
}
