package com.gestionfinanzas.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record RespaldoFinancieroResponse(
        int version,
        Instant generadoEn,
        PerfilResponse perfil,
        List<CuentaResponse> cuentas,
        List<CategoriaResponse> categoriasPersonalizadas,
        List<PresupuestoRespaldo> presupuestos,
        List<PlantillaRecurrenteResponse> recurrencias,
        List<AuditoriaTransaccionResponse> historialMovimientos,
        List<AsientoContableResponse> libroDiario,
        List<TransaccionResponse> transacciones
) {
    public record PresupuestoRespaldo(
            Long id,
            Long categoriaId,
            BigDecimal montoLimite,
            String moneda,
            int mes,
            int anio
    ) {}
}
