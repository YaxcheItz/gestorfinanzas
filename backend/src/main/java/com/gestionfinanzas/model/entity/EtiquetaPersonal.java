package com.gestionfinanzas.model.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name="etiquetas_personales", uniqueConstraints=@UniqueConstraint(name="uk_etiqueta_personal", columnNames={"usuario_id","nombre"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EtiquetaPersonal {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="usuario_id", nullable=false) private Long usuarioId;
    @Column(nullable=false, length=32) private String nombre;
}
