package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Refresh token: la credencial de larga duracion que permite pedir un access token nuevo sin
 * volver a escribir la contrasena.
 *
 * Solo se guarda el hash, igual que con la recuperacion de contrasena. Si alguien lee la base
 * de datos no puede suplantar a nadie, porque los tokens planos nunca se almacenan.
 */
@Entity
@Table(name = "refresh_tokens", indexes = {
        @Index(name = "idx_refresh_hash", columnList = "token_hash", unique = true),
        @Index(name = "idx_refresh_usuario_fecha", columnList = "usuario_id, fecha_creacion")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "token_hash", nullable = false, length = 64, unique = true)
    private String tokenHash;

    /**
     * Version del token con la que se emitio este refresh token. El access token ya lleva la
     * comprobacion, pero el refresh token es de larga duracion: sin esta columna, subir la
     * version (por ejemplo al cambiar la contrasena) mataria el access token y dejaria vivo al
     * refresh, que podria fabricar uno nuevo y resucitar la sesion. Guardarla hace que la regla
     * "subir la version cierra todas las sesiones" se cumpla sola.
     */
    @Column(name = "token_version", nullable = false)
    private int tokenVersion;

    @Column(name = "fecha_expiracion", nullable = false)
    private Instant fechaExpiracion;

    @Column(nullable = false)
    @Builder.Default
    private boolean revocado = false;

    /**
     * Cuando este token fue rotado por uno nuevo. Sirve para reconocer el limite de vida de una
     * credencial: un token que ya tiene sucesor no deberia volver a aceptarse nunca mas.
     */
    @Column(name = "fecha_rotacion")
    private Instant fechaRotacion;

    @CreationTimestamp
    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private Instant fechaCreacion;

    public boolean estaVencido(Instant momento) {
        return !fechaExpiracion.isAfter(momento);
    }
}
