package com.gestionfinanzas.model.entity;

import com.gestionfinanzas.model.enums.RolUsuario;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "usuarios", indexes = {
    @Index(name = "idx_usuario_email", columnList = "email", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "google_subject", unique = true, length = 255)
    private String googleSubject;

    @Column(nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private RolUsuario rol = RolUsuario.ROLE_USER;

    @Column(nullable = false)
    @Builder.Default
    private boolean activo = true;

    @Column(name = "token_version", nullable = false, columnDefinition = "integer not null default 0")
    @Builder.Default
    private int tokenVersion = 0;

    @Column(name = "tema_preferido", nullable = false, length = 10, columnDefinition = "varchar(10) not null default 'CLARO'")
    @Builder.Default
    private String temaPreferido = "CLARO";

    @Column(name = "moneda_preferida", nullable = false, length = 3, columnDefinition = "varchar(3) not null default 'MXN'")
    @Builder.Default
    private String monedaPreferida = "MXN";

    @Column(length = 30)
    private String telefono;

    @Column(name = "notificaciones_whatsapp", nullable = false, columnDefinition = "boolean not null default false")
    @Builder.Default
    private boolean notificacionesWhatsapp = false;

    @Column(name = "ocultar_montos", nullable = false, columnDefinition = "boolean not null default false")
    @Builder.Default
    private boolean ocultarMontos = false;

    @CreationTimestamp
    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;
}
