package com.gestionfinanzas.model.entity;

import com.gestionfinanzas.model.enums.TipoCuenta;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cuentas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cuenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Column(nullable = false, columnDefinition = "BIGINT NOT NULL DEFAULT 0")
    private Long version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(name = "institucion_financiera", length = 60)
    private String institucionFinanciera;

    @Column(name = "cashback_porcentaje", precision = 5, scale = 2)
    private BigDecimal cashbackPorcentaje;

    @Column(name = "cashback_limite_mensual", precision = 15, scale = 2)
    private BigDecimal cashbackLimiteMensual;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoCuenta tipo;

    @Column(name = "saldo_actual", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal saldoActual = BigDecimal.ZERO;

    @Column(nullable = false, length = 10, columnDefinition = "varchar(10) not null default 'MXN'")
    @Builder.Default
    private String moneda = "MXN";

    @Column(length = 255)
    private String descripcion;

    @Column(nullable = false)
    @Builder.Default
    private boolean activo = true;

    @CreationTimestamp
    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;
}
