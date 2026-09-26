package com.gestionfinanzas.model.entity;

import com.gestionfinanzas.model.enums.TipoTransaccion;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "transacciones", indexes = {
    @Index(name = "idx_transaccion_usuario_fecha", columnList = "usuario_id, fecha"),
    @Index(name = "idx_transaccion_cuenta", columnList = "cuenta_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaccion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cuenta_id", nullable = false)
    private Cuenta cuenta;

    // Solo se utiliza si tipo == TRANSFERENCIA (cuenta hacia donde va el dinero)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cuenta_destino_id")
    private Cuenta cuentaDestino;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id")
    private Categoria categoria;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoTransaccion tipo;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal monto;

    @Column(name = "monto_destino", precision = 15, scale = 2)
    private BigDecimal montoDestino;

    @Column(name = "tasa_cambio", precision = 20, scale = 8)
    private BigDecimal tasaCambio;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false, length = 200)
    private String descripcion;

    @Column(length = 500)
    private String notas;

    @CreationTimestamp
    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;
}
