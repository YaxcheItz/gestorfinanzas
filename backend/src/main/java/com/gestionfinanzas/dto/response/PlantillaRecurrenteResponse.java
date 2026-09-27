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
        boolean activa
) {
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
                plantilla.isActiva()
        );
    }
}
