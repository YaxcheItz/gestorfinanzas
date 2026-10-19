package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.Instant;
import java.util.UUID;

/** Telephone proof only; verification does not grant a financial session. */
@Entity @Table(name="conexiones_whatsapp")
@Getter @Setter @NoArgsConstructor
public class ConexionWhatsapp {
    @Id private UUID id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false)
    @JoinColumn(name="usuario_id",nullable=false,unique=true)
    @OnDelete(action=OnDeleteAction.CASCADE)
    private Usuario usuario;
    @Column(nullable=false,length=16) private String estado;
    @Column(length=16) private String telefono;
    @Column(name="telefono_activo_hash",length=64,unique=true) private String telefonoActivoHash;
    @Column(name="desafio_hash",length=64,unique=true) private String desafioHash;
    @Column(nullable=false) private Instant emitida;
    private Instant vence;
    private Instant verificada;
    private Instant revocada;
    @Column(nullable=false) private long generacion;
    @Column(name="guardar_automaticamente",nullable=false) private boolean guardarAutomaticamente;
    @Column(columnDefinition="text") private String contexto;
    @Column(name="contexto_vence") private Instant contextoVence;
    @Column(name="audio_texto",columnDefinition="text") private String audioTexto;
    @Column(name="audio_codigo",length=8) private String audioCodigo;
    @Column(name="audio_vence") private Instant audioVence;
    @Column(name="audio_fecha") private java.time.LocalDate audioFecha;
}
