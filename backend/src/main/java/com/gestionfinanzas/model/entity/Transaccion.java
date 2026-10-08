package com.gestionfinanzas.model.entity;

import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.model.enums.MetodoCaptura;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transacciones", indexes = {
    @Index(name = "idx_transaccion_usuario_fecha", columnList = "usuario_id, fecha"),
    @Index(name = "idx_transaccion_cuenta", columnList = "cuenta_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaccion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cuenta_id")
    private Cuenta cuenta;

    // Solo se utiliza si tipo == TRANSFERENCIA (cuenta hacia donde va el dinero)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cuenta_destino_id")
    private Cuenta cuentaDestino;

    @Column(name = "cuenta_nombre_historico", length = 100)
    private String cuentaNombreHistorico;

    @Column(name = "cuenta_moneda_historica", length = 10)
    private String cuentaMonedaHistorica;

    @Column(name = "cuenta_destino_nombre_historico", length = 100)
    private String cuentaDestinoNombreHistorico;

    @Column(name = "cuenta_destino_moneda_historica", length = 10)
    private String cuentaDestinoMonedaHistorica;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id")
    private Categoria categoria;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoTransaccion tipo;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal monto;

    @Column(name = "monto_destino", precision = 15, scale = 2)
    private BigDecimal montoDestino;

    @Column(name = "tasa_cambio", precision = 20, scale = 8)
    private BigDecimal tasaCambio;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false, length = 200)
    private String descripcion;

    @Column(length = 500)
    private String notas;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_captura", length = 20, updatable = false)
    private MetodoCaptura metodoCaptura;

    @Column(name = "client_request_id", unique = true, updatable = false)
    private UUID clientRequestId;

    @Column(length=64,updatable=false)
    private String clientRequestFingerprint;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cashback_origen_id", unique = true)
    private Transaccion cashbackOrigen;

    private java.util.UUID compraMsiId;

    @CreationTimestamp
    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;
}
