package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "asientos_contables", indexes = {
        @Index(name = "idx_asiento_usuario_fecha", columnList = "usuario_id, fecha_operacion")
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AsientoContable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Usuario usuario;

    @Column(name = "transaccion_origen_id", nullable = false)
    private Long transaccionOrigenId;

    @Column(name = "tipo_evento", nullable = false, length = 24)
    private String tipoEvento;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_movimiento", length = 30)
    private TipoTransaccion tipoMovimiento;

    @Column(name = "fecha_operacion", nullable = false)
    private LocalDate fechaOperacion;

    @Column(nullable = false, length = 200)
    private String descripcion;

    @Column(name = "tasa_cambio", precision = 20, scale = 8)
    private BigDecimal tasaCambio;

    @CreationTimestamp
    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @OneToMany(mappedBy = "asiento", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    @Builder.Default
    private List<LineaAsiento> lineas = new ArrayList<>();

    public void agregarLinea(LineaAsiento linea) {
        lineas.add(linea);
        linea.asociarAsiento(this);
    }
}
