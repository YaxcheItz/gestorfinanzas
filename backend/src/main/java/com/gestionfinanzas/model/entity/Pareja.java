package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Vínculo entre dos personas para llevar gastos compartidos.
 *
 * No es una cuenta bancaria: nadie deposita dinero aquí. Es el registro de qué
 * puso cada quien y en qué se gasta, para poder dizer quién le debe qué a quién.
 *
 * `usuarioA` es quien creó el vínculo y `usuarioB` la pareja. Un usuario solo
 * puede tener una pareja activa a la vez, regla que se valida en el servicio y
 * no se puede expresar con una restricción de base de datos sobre dos columnas.
 */
@Entity
@Table(name = "parejas", indexes = {
        @Index(name = "idx_pareja_usuario_a", columnList = "usuario_a_id"),
        @Index(name = "idx_pareja_usuario_b", columnList = "usuario_b_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pareja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_a_id", nullable = false)
    private Usuario usuarioA;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_b_id", nullable = false)
    private Usuario usuarioB;

    @Column(nullable = false, length = 10, columnDefinition = "varchar(10) not null default 'MXN'")
    @Builder.Default
    private String moneda = "MXN";

    @Column(nullable = false)
    @Builder.Default
    private boolean activa = true;

    @Column(nullable = false, columnDefinition = "boolean not null default false")
    @Builder.Default
    private boolean pendiente = false;

    private LocalDateTime fechaAceptacion;

    @Column(length = 100)
    private String nombreRemitenteInvitacion;
    @Column(length = 150)
    private String correoRemitenteInvitacion;
    @Column(length = 150)
    private String correoDestinatarioInvitacion;

    /** Una importación es una copia privada; no concede acceso al otro miembro. */
    private Long propietarioHistorialId;

    @Version
    @Column(nullable = false, columnDefinition = "bigint not null default 0")
    @Builder.Default
    private Long version = 0L;

    @CreationTimestamp
    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;
}
