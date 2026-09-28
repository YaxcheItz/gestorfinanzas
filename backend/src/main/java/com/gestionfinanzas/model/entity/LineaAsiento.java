package com.gestionfinanzas.model.entity;

import com.gestionfinanzas.model.enums.LadoContable;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "lineas_asiento", indexes = {
        @Index(name = "idx_linea_asiento_id", columnList = "asiento_id, id"),
        @Index(name = "idx_linea_cuenta_codigo_moneda", columnList = "codigo_cuenta, moneda")
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LineaAsiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "asiento_id", nullable = false)
    private AsientoContable asiento;

    @Column(name = "codigo_cuenta", nullable = false, length = 100)
    private String codigoCuenta;

    @Column(name = "nombre_cuenta", nullable = false, length = 200)
    private String nombreCuenta;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal monto;

    @Column(nullable = false, length = 3)
    private String moneda;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private LadoContable lado;

    @Column(name = "cuenta_financiera_id")
    private Long cuentaFinancieraId;

    @Column(name = "categoria_id")
    private Long categoriaId;

    void asociarAsiento(AsientoContable asiento) {
        this.asiento = asiento;
    }
}
