package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.response.AsientoContableResponse;
import com.gestionfinanzas.dto.response.TransaccionResponse;
import com.gestionfinanzas.model.entity.AsientoContable;
import com.gestionfinanzas.model.entity.LineaAsiento;
import com.gestionfinanzas.model.enums.LadoContable;
import com.gestionfinanzas.repository.AsientoContableRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LibroDiarioService {

    private final AsientoContableRepository asientoRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional
    public void registrarCreacion(Long usuarioId, TransaccionResponse movimiento) {
        guardar(usuarioId, movimiento, "CREACION", contabilizar(movimiento, false));
    }

    @Transactional
    public void registrarSaldoInicial(Long usuarioId, TransaccionResponse movimiento, boolean deuda) {
        guardar(usuarioId, movimiento, "SALDO_INICIAL", contabilizarSaldoInicial(movimiento, deuda, false));
    }

    @Transactional
    public void registrarActualizacion(Long usuarioId, TransaccionResponse antes, TransaccionResponse despues) {
        List<LineaAsiento> lineas = new ArrayList<>(contabilizar(antes, true));
        lineas.addAll(contabilizar(despues, false));
        guardar(usuarioId, despues, "ACTUALIZACION", lineas);
    }

    @Transactional
    public void registrarEliminacion(Long usuarioId, TransaccionResponse movimiento) {
        guardar(usuarioId, movimiento, "ELIMINACION", contabilizar(movimiento, true));
    }

    @Transactional(readOnly = true)
    public Page<AsientoContableResponse> listar(Long usuarioId, Pageable pageable) {
        return asientoRepository.findByUsuarioIdOrderByFechaOperacionDescIdDesc(usuarioId, pageable)
                .map(AsientoContableResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<AsientoContableResponse> listarParaRespaldo(Long usuarioId) {
        return asientoRepository.findAllByUsuarioIdOrderByFechaOperacionAscIdAsc(usuarioId).stream()
                .map(AsientoContableResponse::fromEntity)
                .toList();
    }

    private void guardar(Long usuarioId, TransaccionResponse movimiento, String tipoEvento,
                         List<LineaAsiento> lineas) {
        if (movimiento.id() == null || lineas.isEmpty()) {
            throw new IllegalArgumentException("No se puede registrar un asiento sin movimiento y partidas.");
        }
        validarBalance(lineas);
        AsientoContable asiento = AsientoContable.builder()
                .usuario(usuarioRepository.getReferenceById(usuarioId))
                .transaccionOrigenId(movimiento.id())
                .tipoEvento(tipoEvento)
                .fechaOperacion(movimiento.fecha())
                .descripcion(limitar(movimiento.descripcion(), 200))
                .tasaCambio(movimiento.tasaCambio())
                .build();
        lineas.forEach(asiento::agregarLinea);
        asientoRepository.save(asiento);
    }

    private List<LineaAsiento> contabilizar(TransaccionResponse movimiento, boolean invertir) {
        List<LineaAsiento> lineas = switch (movimiento.tipo()) {
            case GASTO -> gasto(movimiento);
            case INGRESO -> ingreso(movimiento);
            case TRANSFERENCIA -> transferencia(movimiento);
            case SALDO_INICIAL -> contabilizarSaldoInicial(movimiento, false, false);
        };
        return invertir ? lineas.stream().map(this::invertir).toList() : lineas;
    }

    private List<LineaAsiento> contabilizarSaldoInicial(
            TransaccionResponse movimiento, boolean deuda, boolean invertir
    ) {
        validarCuentaOrigen(movimiento);
        List<LineaAsiento> lineas = new ArrayList<>();
        LadoContable ladoCuenta = deuda ? LadoContable.HABER : LadoContable.DEBE;
        lineas.add(linea("CUENTA:" + movimiento.cuentaId(),
                "Cuenta · " + movimiento.cuentaNombre(), movimiento.monto(), monedaOrigen(movimiento),
                ladoCuenta, movimiento.cuentaId(), null));
        lineas.add(linea("PATRIMONIO:SALDOS_INICIALES", "Saldos iniciales",
                movimiento.monto(), monedaOrigen(movimiento),
                deuda ? LadoContable.DEBE : LadoContable.HABER, null, null));
        return invertir ? lineas.stream().map(this::invertir).toList() : lineas;
    }

    private List<LineaAsiento> gasto(TransaccionResponse movimiento) {
        validarCuentaOrigen(movimiento);
        String codigoGasto = movimiento.categoriaId() == null
                ? "GASTO:SIN_CATEGORIA"
                : "GASTO:" + movimiento.categoriaId();
        String nombreGasto = movimiento.categoriaNombre() == null
                ? "Gastos · Sin categoría"
                : "Gastos · " + movimiento.categoriaNombre();
        return List.of(
                linea(codigoGasto, nombreGasto, movimiento.monto(), monedaOrigen(movimiento),
                        LadoContable.DEBE, null, movimiento.categoriaId()),
                linea("CUENTA:" + movimiento.cuentaId(),
                        "Cuenta · " + movimiento.cuentaNombre(), movimiento.monto(), monedaOrigen(movimiento),
                        LadoContable.HABER, movimiento.cuentaId(), null)
        );
    }

    private List<LineaAsiento> ingreso(TransaccionResponse movimiento) {
        validarCuentaOrigen(movimiento);
        String codigoIngreso = movimiento.categoriaId() == null
                ? "INGRESO:SIN_CATEGORIA"
                : "INGRESO:" + movimiento.categoriaId();
        String nombreIngreso = movimiento.categoriaNombre() == null
                ? "Ingresos · Sin categoría"
                : "Ingresos · " + movimiento.categoriaNombre();
        return List.of(
                linea("CUENTA:" + movimiento.cuentaId(),
                        "Cuenta · " + movimiento.cuentaNombre(), movimiento.monto(), monedaOrigen(movimiento),
                        LadoContable.DEBE, movimiento.cuentaId(), null),
                linea(codigoIngreso, nombreIngreso, movimiento.monto(), monedaOrigen(movimiento),
                        LadoContable.HABER, null, movimiento.categoriaId())
        );
    }

    private List<LineaAsiento> transferencia(TransaccionResponse movimiento) {
        validarCuentaOrigen(movimiento);
        if (movimiento.cuentaDestinoId() == null || movimiento.cuentaDestinoNombre() == null) {
            throw new IllegalArgumentException("La transferencia necesita una cuenta de destino para contabilizarse.");
        }
        String monedaOrigen = monedaOrigen(movimiento);
        String monedaDestino = movimiento.monedaDestino() == null ? monedaOrigen : movimiento.monedaDestino();
        BigDecimal montoDestino = movimiento.montoDestino() == null
                ? movimiento.monto() : movimiento.montoDestino();
        if (monedaOrigen.equals(monedaDestino)) {
            if (movimiento.monto().compareTo(montoDestino) != 0) {
                throw new IllegalArgumentException("Una transferencia en la misma moneda debe tener montos iguales.");
            }
            return List.of(
                    linea("CUENTA:" + movimiento.cuentaDestinoId(),
                            "Cuenta · " + movimiento.cuentaDestinoNombre(), montoDestino, monedaDestino,
                            LadoContable.DEBE, movimiento.cuentaDestinoId(), null),
                    linea("CUENTA:" + movimiento.cuentaId(),
                            "Cuenta · " + movimiento.cuentaNombre(), movimiento.monto(), monedaOrigen,
                            LadoContable.HABER, movimiento.cuentaId(), null)
            );
        }

        return List.of(
                linea("CUENTA:" + movimiento.cuentaDestinoId(),
                        "Cuenta · " + movimiento.cuentaDestinoNombre(), montoDestino, monedaDestino,
                        LadoContable.DEBE, movimiento.cuentaDestinoId(), null),
                linea("PUENTE:CAMBIO:" + monedaDestino, "Puente cambiario · " + monedaDestino,
                        montoDestino, monedaDestino, LadoContable.HABER, null, null),
                linea("PUENTE:CAMBIO:" + monedaOrigen, "Puente cambiario · " + monedaOrigen,
                        movimiento.monto(), monedaOrigen, LadoContable.DEBE, null, null),
                linea("CUENTA:" + movimiento.cuentaId(),
                        "Cuenta · " + movimiento.cuentaNombre(), movimiento.monto(), monedaOrigen,
                        LadoContable.HABER, movimiento.cuentaId(), null)
        );
    }

    private LineaAsiento linea(String codigo, String nombre, BigDecimal monto, String moneda,
                               LadoContable lado, Long cuentaId, Long categoriaId) {
        if (monto == null || monto.signum() <= 0 || moneda == null || moneda.isBlank()) {
            throw new IllegalArgumentException("Cada partida contable requiere monto positivo y moneda.");
        }
        return LineaAsiento.builder()
                .codigoCuenta(codigo)
                .nombreCuenta(limitar(nombre, 200))
                .monto(monto)
                .moneda(moneda)
                .lado(lado)
                .cuentaFinancieraId(cuentaId)
                .categoriaId(categoriaId)
                .build();
    }

    private LineaAsiento invertir(LineaAsiento linea) {
        return LineaAsiento.builder()
                .codigoCuenta(linea.getCodigoCuenta())
                .nombreCuenta(linea.getNombreCuenta())
                .monto(linea.getMonto())
                .moneda(linea.getMoneda())
                .lado(linea.getLado() == LadoContable.DEBE ? LadoContable.HABER : LadoContable.DEBE)
                .cuentaFinancieraId(linea.getCuentaFinancieraId())
                .categoriaId(linea.getCategoriaId())
                .build();
    }

    private void validarBalance(List<LineaAsiento> lineas) {
        Map<String, BigDecimal[]> totales = new HashMap<>();
        for (LineaAsiento linea : lineas) {
            BigDecimal[] saldos = totales.computeIfAbsent(
                    linea.getMoneda(), ignored -> new BigDecimal[] { BigDecimal.ZERO, BigDecimal.ZERO }
            );
            int lado = linea.getLado() == LadoContable.DEBE ? 0 : 1;
            saldos[lado] = saldos[lado].add(linea.getMonto());
        }
        boolean balanceado = totales.values().stream()
                .allMatch(saldos -> saldos[0].compareTo(saldos[1]) == 0);
        if (!balanceado) {
            throw new IllegalStateException("El asiento debe cuadrar por separado en cada moneda.");
        }
    }

    private void validarCuentaOrigen(TransaccionResponse movimiento) {
        if (movimiento.cuentaId() == null || movimiento.cuentaNombre() == null) {
            throw new IllegalArgumentException("El movimiento necesita una cuenta de origen para contabilizarse.");
        }
    }

    private String monedaOrigen(TransaccionResponse movimiento) {
        if (movimiento.moneda() == null || movimiento.moneda().isBlank()) {
            throw new IllegalArgumentException("El movimiento necesita una moneda de origen para contabilizarse.");
        }
        return movimiento.moneda();
    }

    private String limitar(String valor, int maximo) {
        String texto = valor == null || valor.isBlank() ? "Movimiento financiero" : valor;
        return texto.length() <= maximo ? texto : texto.substring(0, maximo);
    }
}
