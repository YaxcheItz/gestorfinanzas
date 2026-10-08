package com.gestionfinanzas.dto.response;

import com.gestionfinanzas.model.enums.TipoReparto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Estado completo de la pareja: quién es cada quien, cómo va el fondo común y
 * los tres listados de movimientos.
 *
 * Los subtipos van anidados porque solo existen dentro de una pareja: no tiene
 * sentido poder leer un gasto suelto sin el reparto que lo acompaña.
 */
public record ParejaResponse(
        Long id,
        String moneda,
        LocalDateTime fechaCreacion,
        Miembro yo,
        Miembro pareja,
        Resumen resumen,
        List<Aporte> aportes,
        List<Gasto> gastos,
        List<Pago> pagos,
        boolean activa
) {
    public ParejaResponse(Long id, String moneda, LocalDateTime fechaCreacion, Miembro yo, Miembro pareja,
            Resumen resumen, List<Aporte> aportes, List<Gasto> gastos, List<Pago> pagos) {
        this(id,moneda,fechaCreacion,yo,pareja,resumen,aportes,gastos,pagos,true);
    }

    /**
     * Posición de una persona dentro de la pareja.
     *
     * `saldo` es lo que se le debe a esa persona: el dinero que puso y todavía
     * no se le ha devuelto. Positivo significa que le deben; negativo, que debe.
     * La suma de los dos saldos es el dinero que queda en el fondo común, y
     * conviene que la interfaz muestre esa suma para poder revisarla a ojo.
     */
    public record Miembro(
            Long id,
            String nombre,
            String email,
            BigDecimal aportado,
            BigDecimal consumido,
            BigDecimal pagado,
            BigDecimal cobrado,
            BigDecimal saldo
    ) {}

    /**
     * `@param montoDeuda` en cuánto queda la cuenta si se salda ahora, y
     *                     `@code idQuienDebe` quién paga. Va en cero con el id
     *                     nulo cuando ya están a mano.
     */
    public record Resumen(
            BigDecimal fondoDisponible,
            BigDecimal totalAportado,
            BigDecimal totalGastado,
            Long cantidadAportes,
            Long cantidadGastos,
            Long cantidadPagos,
            Long idQuienDebe,
            BigDecimal montoDeuda
    ) {}

    public record Aporte(
            Long id,
            Long usuarioId,
            String usuarioNombre,
            BigDecimal monto,
            String moneda,
            LocalDate fecha,
            String notas,
            LocalDateTime fechaCreacion
    ) {}

    /**
     * @param miParte lo que le toca a quien está mirando la pantalla, para no
     *              tener que recalcularlo en el cliente.
     */
    public record Gasto(
            Long id,
            Long pagadoPorId,
            String pagadoPorNombre,
            BigDecimal monto,
            String moneda,
            LocalDate fecha,
            String descripcion,
            TipoReparto tipoReparto,
            List<Parte> repartos,
            BigDecimal miParte,
            LocalDateTime fechaCreacion
    ) {}

    public record Parte(
            Long usuarioId,
            String usuarioNombre,
            BigDecimal monto,
            BigDecimal porcentaje
    ) {}

    public record Pago(
            Long id,
            Long pagadorId,
            String pagadorNombre,
            Long beneficiarioId,
            String beneficiarioNombre,
            BigDecimal monto,
            String moneda,
            LocalDate fecha,
            String notas,
            LocalDateTime fechaCreacion,
            Long registradoPorId
    ) {}
}
