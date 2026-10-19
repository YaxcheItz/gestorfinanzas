package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.Instant;

@Entity @Table(name="eventos_whatsapp") @Getter @Setter @NoArgsConstructor
public class EventoWhatsapp {
    @Id @Column(length=64) private String id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false)
    @JoinColumn(name="conexion_id",nullable=false)
    @OnDelete(action=OnDeleteAction.CASCADE) private ConexionWhatsapp conexion;
    @Column(nullable=false) private long generacion;
    @Column(name="contenido_hash",length=64,nullable=false) private String contenidoHash;
    @Column(nullable=false,columnDefinition="text") private String respuesta;
    @Column(nullable=false) private Instant creado;
}
