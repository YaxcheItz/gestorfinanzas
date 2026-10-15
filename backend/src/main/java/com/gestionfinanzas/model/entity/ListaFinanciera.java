package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "listas_financieras", uniqueConstraints = @UniqueConstraint(name = "uk_lista_personal", columnNames = {"propietario_id", "clave"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ListaFinanciera {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "propietario_id") private Usuario propietario;
    @Column(nullable = false, length = 60) private String nombre;
    @Column(nullable = false, length = 24) @Builder.Default private String emoji = "🌿";
    @Column(nullable = false, length = 3) @Builder.Default private String moneda = "MXN";
    @Column(length = 12) private String clave;
    @Column(nullable = false) @Builder.Default private boolean archivada = false;
    @Column(name = "invitacion_hash", unique = true, length = 64) private String invitacionHash;
    @Column(name = "invitacion_vence") private Instant invitacionVence;
    @Column(name = "invitacion_rol", length = 12) private String invitacionRol;
}
