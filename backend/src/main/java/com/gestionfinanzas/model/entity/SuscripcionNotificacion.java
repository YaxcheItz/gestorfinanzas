package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "suscripciones_notificacion_push", indexes = {
        @Index(name = "idx_push_suscripcion_usuario", columnList = "usuario_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SuscripcionNotificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, unique = true, length = 2048)
    private String endpoint;

    @Column(name = "clave_publica", nullable = false, length = 200)
    private String clavePublica;

    @Column(name = "secreto_auth", nullable = false, length = 100)
    private String secretoAuth;

    @Column(name = "creada_en", nullable = false)
    private LocalDateTime creadaEn;

    @PrePersist
    void alCrear() {
        if (creadaEn == null) creadaEn = LocalDateTime.now();
    }
}
