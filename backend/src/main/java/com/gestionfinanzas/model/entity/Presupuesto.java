package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "presupuestos", uniqueConstraints = {
    @UniqueConstraint(name = "uk_presupuesto_usuario_cat_periodo", columnNames = {"usuario_id", "categoria_id", "mes", "anio"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Presupuesto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id", nullable = false)
    private Categoria categoria;

    @Column(name = "monto_limite", nullable = false, precision = 15, scale = 2)
    private BigDecimal montoLimite;

    @Column(nullable = false)
    private int mes;

    @Column(nullable = false)
    private int anio;
}
