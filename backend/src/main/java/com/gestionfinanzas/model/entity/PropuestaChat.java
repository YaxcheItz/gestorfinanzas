package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name="propuestas_chat", indexes=@Index(name="idx_propuesta_usuario", columnList="usuario_id"))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PropuestaChat {
    @Id @Column(length=36) private String id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="usuario_id", nullable=false) private Usuario usuario;
    @Column(nullable=false, length=40) private String tipo;
    @Column(nullable=false, length=500) private String resumen;
    @Column(nullable=false, columnDefinition="text") private String datos;
    @Column(nullable=false) private Instant vence;
    @Column(nullable=false) @Builder.Default private boolean completada=false;
    @Column(nullable=false) @Builder.Default private boolean descartada=false;
    @Version @Column(nullable=false) @Builder.Default private Long version=0L;
}
