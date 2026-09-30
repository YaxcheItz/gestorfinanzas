package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Gasto compartido. Lo paga una persona y se reparte entre las dos.
 *
 * La parte que le toca a cada quien no se guarda aquí sino en
 * {@link RepartoGasto}, una fila por persona, para que el reparto quede
 * congelado al momento de registrar el gasto.
 */
@Entity
@Table(name = "gastos_pareja", indexes = {
        @Index(name = "idx_gasto_pareja", columnList = "pareja_id, fecha")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GastoPareja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pareja_id", nullable = false)
    private Pareja pareja;

    /** Quién lo pagó de su bolsillo. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pagado_por_id", nullable = false)
    private Usuario pagadoPor;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal monto;

    @Column(nullable = false, length = 10)
    private String moneda;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false, length = 200)
    private String descripcion;

    @CreationTimestamp
    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;
}
