package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.Instant;

@Entity
@Table(name="conexiones_android",uniqueConstraints={
    @UniqueConstraint(name="uk_android_dispositivo",columnNames={"usuario_id","dispositivo_id"}),
    @UniqueConstraint(name="uk_android_token",columnNames="token_hash")})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ConexionAndroid {
    @Id @Column(length=36) private String id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="usuario_id",nullable=false)
    @OnDelete(action=OnDeleteAction.CASCADE)
    private Usuario usuario;
    @Column(nullable=false,length=36) private String dispositivoId;
    @Column(nullable=false,length=64) private String tokenHash;
    @Column(nullable=false) private int tokenVersion;
    @Column(nullable=false,columnDefinition="text") private String reglas;
    @Column(nullable=false) private Instant vence;
}
