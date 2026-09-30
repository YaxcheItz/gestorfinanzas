package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Dinero que una de las dos personas aporta al fondo común.
 *
 * Aportar no es gastar: es poner de su bolsillo. Se admite en cualquier momento
 * y por cualquier monto, no hace falta aportar la mitad ni completarlo.
 */
@Entity
@Table(name = "aportes_pareja", indexes = {
        @Index(name = "idx_aporte_pareja", columnList = "pareja_id, fecha")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AportacionPareja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pareja_id", nullable = false)
    private Pareja pareja;

    /** Quién puso el dinero. Puede ser cualquiera de los dos. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

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
