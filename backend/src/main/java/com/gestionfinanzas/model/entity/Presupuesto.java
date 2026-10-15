package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "presupuestos", uniqueConstraints = {
    @UniqueConstraint(name = "uk_presupuesto_usuario_cat_periodo_lista", columnNames = {"usuario_id", "categoria_id", "mes", "anio", "lista_id"})
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
    @JoinColumn(name = "lista_id")
    private ListaFinanciera lista;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id", nullable = false)
    private Categoria categoria;

    @Column(name = "monto_limite", nullable = false, precision = 15, scale = 2)
    private BigDecimal montoLimite;

    @Column(nullable = false, length = 3, columnDefinition = "varchar(3) not null default 'MXN'")
    @Builder.Default
    private String moneda = "MXN";

    @Column(name = "porcentaje_alerta", nullable = false, columnDefinition = "integer not null default 80")
    @Builder.Default
    private Integer porcentajeAlerta = 80;

    @Column(nullable = false)
    private int mes;

    @Column(nullable = false)
    private int anio;
}
