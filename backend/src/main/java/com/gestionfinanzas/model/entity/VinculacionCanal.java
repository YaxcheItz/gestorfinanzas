package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.Instant;

/** Only a hash of the single-use approval code is persisted. */
@Entity @Table(name = "vinculaciones_canal")
@Getter @Setter @NoArgsConstructor
public class VinculacionCanal {
    @Id @Column(length = 64) private String hash;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Usuario usuario;
    @Column(nullable = false, length = 43) private String challenge;
    @Column(name = "token_version", nullable = false) private int tokenVersion;
    @Column(nullable = false) private Instant vence;
}
