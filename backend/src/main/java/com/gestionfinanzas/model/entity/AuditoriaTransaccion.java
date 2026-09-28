package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;

@Entity
@Table(name = "auditoria_transacciones", indexes = {
        @Index(name = "idx_auditoria_transaccion_usuario_fecha", columnList = "usuario_id, fecha_evento")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditoriaTransaccion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Usuario usuario;

    @Column(name = "transaccion_id", nullable = false)
    private Long transaccionId;

    @Column(nullable = false, length = 12)
    private String accion;

    @Column(name = "antes_json", columnDefinition = "text")
    private String antesJson;

    @Column(name = "despues_json", columnDefinition = "text")
    private String despuesJson;

    @CreationTimestamp
    @Column(name = "fecha_evento", nullable = false, updatable = false)
    private Instant fechaEvento;
}
