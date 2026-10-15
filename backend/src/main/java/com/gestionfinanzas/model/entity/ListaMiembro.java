package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "lista_miembros", uniqueConstraints = @UniqueConstraint(name = "uk_lista_miembro", columnNames = {"lista_id", "usuario_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ListaMiembro {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "lista_id", nullable = false) private ListaFinanciera lista;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "usuario_id", nullable = false) private Usuario usuario;
    @Column(nullable = false, length = 12) private String rol;
}
