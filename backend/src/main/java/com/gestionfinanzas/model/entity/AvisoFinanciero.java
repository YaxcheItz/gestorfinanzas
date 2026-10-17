package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="avisos_financieros")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AvisoFinanciero {
    @Id @Column(length=36) private String id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="usuario_id",nullable=false)
    @OnDelete(action=OnDeleteAction.CASCADE)
    private Usuario usuario;
    @Column(nullable=false,length=20) private String origen;
    @Column(nullable=false,length=64) private String identificadorHash;
    @Column(nullable=false,length=64) private String recepcionHash;
    @Column(nullable=false,unique=true) private UUID claveRegistro;
    @Column(nullable=false,length=200) private String resumen;
    @Column(nullable=false,length=25) private String clase;
    @Column(nullable=false,length=15) private String estado;
    @Column(nullable=false,length=3) private String moneda;
    @Column(columnDefinition="text") private String datos;
    private Long transaccionId;
    @Column(nullable=false) private Instant creadoEn;
    @Version @Column(nullable=false) @Builder.Default private Long version=0L;
}
