package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Pago de una persona a la otra para saldar lo que debe.
 *
 * El fondo común es virtual: el dinero nunca pasa por aquí, así que este
 * registro solo documenta que hubo un pago real entre los dos y descuenta esa
 * cantidad de la deuda.
 */
@Entity
@Table(name = "pagos_pareja", indexes = {
        @Index(name = "idx_pago_pareja", columnList = "pareja_id, fecha")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PagoPareja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pareja_id", nullable = false)
    private Pareja pareja;

    /** Quien paga. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pagador_id", nullable = false)
    private Usuario pagador;

    /** Quien recibe. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "beneficiario_id", nullable = false)
    private Usuario beneficiario;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal monto;

    @Column(nullable = false, length = 10)
    private String moneda;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(length = 500)
    private String notas;

    @CreationTimestamp
    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;
}
