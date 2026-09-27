package com.gestionfinanzas.model.entity;

import com.gestionfinanzas.model.enums.FrecuenciaRecurrencia;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "plantillas_recurrentes", indexes = {
        @Index(name = "idx_plantilla_recurrente_usuario_fecha", columnList = "usuario_id, siguiente_fecha")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlantillaRecurrente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cuenta_id", nullable = false)
    private Cuenta cuenta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id")
    private Categoria categoria;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoTransaccion tipo;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal monto;

    @Column(length = 500)
    private String notas;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FrecuenciaRecurrencia frecuencia;

    @Column(name = "siguiente_fecha", nullable = false)
    private LocalDate siguienteFecha;

    @Column(nullable = false)
    @Builder.Default
    private boolean activa = true;

    @CreationTimestamp
    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;
}
