package com.gestionfinanzas.model.entity;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="categorias_historicas") @Getter @NoArgsConstructor @AllArgsConstructor @Builder
public class CategoriaHistorica {
 @Id private Long id;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="usuario_id",nullable=false) private Usuario usuario;
 @Column(nullable=false,length=80) private String nombre;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=30) private TipoTransaccion tipo;
 @Column(length=50) private String icono;
 @Column(length=7) private String color;
 public static CategoriaHistorica copiar(Categoria c) {return new CategoriaHistorica(c.getId(),c.getUsuario(),c.getNombre(),c.getTipo(),c.getIcono(),c.getColor());}
 public Categoria comoCategoria() {return Categoria.builder().id(id).usuario(usuario).nombre(nombre).tipo(tipo).icono(icono).color(color).activo(false).build();}
}
