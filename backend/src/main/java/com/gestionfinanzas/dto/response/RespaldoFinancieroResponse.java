package com.gestionfinanzas.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
        List<TransaccionResponse> transacciones,
        List<CashbackRespaldo> relacionesCashback,
        List<ParejaRespaldo> parejas
) {
    public record CashbackRespaldo(Long transaccionId, Long origenId) {}

    /**
     * Cada persona se guarda con una copia de su nombre y una marca de si es la dueña
     * del respaldo. No se guardan ids de usuario: al restaurar en otra cuenta esos ids
     * no significan nada, y la pareja se localiza por su correo.
     */
    public record MiembroRespaldo(String nombre, boolean propietario) {}

    public record ParejaRespaldo(
            Long id,
            boolean activa,
            String moneda,
            LocalDateTime fechaCreacion,
            String nombrePareja,
            String emailPareja,
            List<AporteRespaldo> aportes,
            List<GastoRespaldo> gastos,
            List<PagoRespaldo> pagos
    ) {}

    public record AporteRespaldo(
            Long id,
            MiembroRespaldo usuario,
            BigDecimal monto,
            String moneda,
            LocalDate fecha,
            String notas,
            LocalDateTime fechaCreacion
    ) {}

    public record GastoRespaldo(
            Long id,
            MiembroRespaldo pagadoPor,
            BigDecimal monto,
            String moneda,
            LocalDate fecha,
            String descripcion,
            String tipoReparto,
            List<ParteRespaldo> repartos,
            LocalDateTime fechaCreacion
    ) {}

    public record ParteRespaldo(MiembroRespaldo usuario, BigDecimal monto, BigDecimal porcentaje) {}

    public record PagoRespaldo(
            Long id,
            MiembroRespaldo pagador,
            MiembroRespaldo beneficiario,
            BigDecimal monto,
            String moneda,
            LocalDate fecha,
            String notas,
            LocalDateTime fechaCreacion
    ) {}

    public record PresupuestoRespaldo(
            Long id,
            Long categoriaId,
            BigDecimal montoLimite,
            String moneda,
            int mes,
            int anio
    ) {}
}
