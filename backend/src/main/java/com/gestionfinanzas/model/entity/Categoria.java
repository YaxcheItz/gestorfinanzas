package com.gestionfinanzas.model.entity;

import com.gestionfinanzas.model.enums.TipoTransaccion;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "categorias")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Categoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Si es null, es una categoría global/del sistema accesible para todos
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(nullable = false, length = 80)
    private String nombre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoTransaccion tipo;

    @Column(length = 50)
    private String icono;

    @Column(length = 20)
    private String color;

    @Column(nullable = false, columnDefinition = "boolean not null default true")
    @Builder.Default
    private boolean activo = true;
}
