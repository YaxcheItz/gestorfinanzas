package com.gestionfinanzas.model.entity;

import com.gestionfinanzas.model.enums.TipoReparto;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * La parte de un {@link GastoPareja} que le toca a una persona.
 *
 * Siempre hay exactamente dos filas por gasto, una por cada miembro de la
 * pareja, y la restricción única sobre (gasto, usuario) impide que se repita
 * una persona aunque el servicio falle a medio guardar.
 *
 * Se guarda el importe ya resuelto (`monto`) y no solo el porcentaje o la
 * regla. Si se guardara la regla, cualquier cambio futuro de la regla de
 * reparto o un redondeo distinto recalcularía el saldo de gastos ya
 * registrados y el historial dejaría de cuadrar con lo que se vio al
 * registrarlos. `porcentaje` queda solo como dato de referencia de cómo se
 * decidió.
 */
@Entity
@Table(name = "repartos_gasto", uniqueConstraints = {
        @UniqueConstraint(name = "uq_reparto_gasto_usuario", columnNames = {"gasto_id", "usuario_id"})
}, indexes = {
        @Index(name = "idx_reparto_gasto", columnList = "gasto_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RepartoGasto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gasto_id", nullable = false)
    private GastoPareja gasto;

    /** A quién le toca esta parte. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal monto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoReparto tipo;

    /** Solo se llena para {@link TipoReparto#PORCENTAJE}. */
    @Column(precision = 5, scale = 2)
    private BigDecimal porcentaje;
}
