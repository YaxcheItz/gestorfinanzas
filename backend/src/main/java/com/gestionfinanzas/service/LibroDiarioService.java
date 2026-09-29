package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.response.AsientoContableResponse;
import com.gestionfinanzas.dto.response.BackfillLibroDiarioResponse;
import com.gestionfinanzas.dto.response.ConciliacionMonedaResponse;
import com.gestionfinanzas.dto.response.ConciliacionCuentaResponse;
import com.gestionfinanzas.dto.response.TransaccionResponse;
import com.gestionfinanzas.model.entity.AsientoContable;
import com.gestionfinanzas.model.entity.LineaAsiento;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.LadoContable;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.AsientoContableRepository;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
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
import java.util.LinkedHashMap;
import java.util.TreeMap;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class LibroDiarioService {

    private final AsientoContableRepository asientoRepository;
    private final TransaccionRepository transaccionRepository;
    private final CuentaRepository cuentaRepository;
    private final UsuarioRepository usuarioRepository;

    private static final int MAXIMO_BACKFILL_POR_LOTE = 100;

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
    public Page<AsientoContableResponse> listar(Long usuarioId, Pageable pageable, LocalDate desde,
                                                LocalDate hasta, String tipoEvento,
                                                TipoTransaccion tipoMovimiento, Long cuentaId) {
        Page<AsientoContable> page = asientoRepository.buscarConFiltros(
                usuarioId, desde, hasta, tipoEvento, tipoMovimiento, cuentaId, pageable);
        Map<Long, TipoTransaccion> tipoPorMovimiento = new HashMap<>();
        transaccionRepository.findAllById(page.getContent().stream()
                        .map(AsientoContable::getTransaccionOrigenId).distinct().toList())
                .forEach(transaccion -> tipoPorMovimiento.put(transaccion.getId(), transaccion.getTipo()));
        return page.map(asiento -> AsientoContableResponse.fromEntity(
                asiento, tipoPorMovimiento.get(asiento.getTransaccionOrigenId())));
    }

    @Transactional(readOnly = true)
    public List<AsientoContableResponse> listarParaRespaldo(Long usuarioId) {
        return asientoRepository.findAllByUsuarioIdOrderByFechaOperacionAscIdAsc(usuarioId).stream()
                .map(AsientoContableResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public BackfillLibroDiarioResponse previsualizarBackfill(Long usuarioId) {
        return resumirBackfill(usuarioId, 0);
    }

    /**
     * Convierte el estado actual de los movimientos que todavía no tienen asientos.
     * Solo escribe en el ledger; nunca recalcula ni actualiza saldos operativos.
     */
    @Transactional
    public BackfillLibroDiarioResponse ejecutarBackfill(Long usuarioId) {
        List<Transaccion> movimientos = transaccionRepository.findAllByUsuarioIdOrderByFechaAscIdAsc(usuarioId);
        int procesados = 0;
        for (Transaccion movimiento : movimientos) {
            if (procesados >= MAXIMO_BACKFILL_POR_LOTE) break;
            Transaccion bloqueado = transaccionRepository.findByIdAndUsuarioIdForUpdate(
                    movimiento.getId(), usuarioId
            ).orElse(null);
            if (bloqueado == null || asientoRepository.existsByUsuarioIdAndTransaccionOrigenId(
                    usuarioId, bloqueado.getId())) {
                continue;
            }
            try {
                List<LineaAsiento> lineas = lineasBackfill(bloqueado);
                guardar(usuarioId, TransaccionResponse.fromEntity(bloqueado), "BACKFILL", lineas);
                procesados++;
            } catch (IllegalArgumentException | IllegalStateException ignorada) {
                // El resumen identifica estos movimientos para que el usuario pueda corregirlos.
            }
        }
        return resumirBackfill(usuarioId, procesados);
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
                .tipoMovimiento(movimiento.tipo())
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

    private List<LineaAsiento> lineasBackfill(Transaccion movimiento) {
        TransaccionResponse respuesta = TransaccionResponse.fromEntity(movimiento);
        if (movimiento.getTipo() == com.gestionfinanzas.model.enums.TipoTransaccion.SALDO_INICIAL) {
            boolean deuda = movimiento.getCuenta() != null
                    && movimiento.getCuenta().getTipo() == TipoCuenta.CREDITO;
            return contabilizarSaldoInicial(respuesta, deuda, false);
        }
        return contabilizar(respuesta, false);
    }

    private BackfillLibroDiarioResponse resumirBackfill(Long usuarioId, int procesados) {
        List<Transaccion> movimientos = transaccionRepository.findAllByUsuarioIdOrderByFechaAscIdAsc(usuarioId);
        java.util.Set<Long> contabilizadas = asientoRepository.findTransaccionesContabilizadas(usuarioId);
        int yaContabilizados = 0;
        int pendientes = 0;
        int omitidos = 0;
        Map<String, Integer> motivos = new TreeMap<>();
        Map<String, BigDecimal[]> totales = new TreeMap<>();

        for (Transaccion movimiento : movimientos) {
            if (contabilizadas.contains(movimiento.getId())) {
                yaContabilizados++;
                continue;
            }
            try {
                List<LineaAsiento> lineas = lineasBackfill(movimiento);
                validarBalance(lineas);
                pendientes++;
                for (LineaAsiento linea : lineas) {
                    BigDecimal[] lados = totales.computeIfAbsent(linea.getMoneda(),
                            ignorado -> new BigDecimal[] { BigDecimal.ZERO, BigDecimal.ZERO });
                    int lado = linea.getLado() == LadoContable.DEBE ? 0 : 1;
                    lados[lado] = lados[lado].add(linea.getMonto());
                }
            } catch (IllegalArgumentException | IllegalStateException ex) {
                omitidos++;
                motivos.merge(motivoOmitido(ex), 1, Integer::sum);
            }
        }

        Map<String, ConciliacionMonedaResponse> conciliacion = new LinkedHashMap<>();
        totales.forEach((moneda, lados) -> conciliacion.put(moneda,
                new ConciliacionMonedaResponse(lados[0], lados[1], lados[0].subtract(lados[1]))));

        Map<Long, BigDecimal> saldosLibro = new HashMap<>();
        asientoRepository.findAllByUsuarioIdOrderByFechaOperacionAscIdAsc(usuarioId).stream()
                .flatMap(asiento -> asiento.getLineas().stream())
                .filter(linea -> linea.getCuentaFinancieraId() != null)
                .forEach(linea -> sumarSaldoCuenta(saldosLibro, linea));
        for (Transaccion movimiento : movimientos) {
            if (contabilizadas.contains(movimiento.getId())) continue;
            try {
                for (LineaAsiento linea : lineasBackfill(movimiento)) {
                    if (linea.getCuentaFinancieraId() != null) sumarSaldoCuenta(saldosLibro, linea);
                }
            } catch (IllegalArgumentException | IllegalStateException ignorada) {
                // Movimientos omitidos no forman parte del saldo proyectado.
            }
        }
        List<ConciliacionCuentaResponse> conciliacionCuentas = cuentaRepository
                .findByUsuarioIdOrderByActivoDescNombreAsc(usuarioId).stream()
                .map(cuenta -> {
                    BigDecimal saldoLibro = saldosLibro.getOrDefault(cuenta.getId(), BigDecimal.ZERO);
                    if (cuenta.getTipo() == TipoCuenta.CREDITO) saldoLibro = saldoLibro.negate();
                    BigDecimal saldoOperativo = cuenta.getSaldoActual();
                    return new ConciliacionCuentaResponse(cuenta.getId(), cuenta.getNombre(), cuenta.getMoneda(),
                            saldoOperativo, saldoLibro, saldoLibro.subtract(saldoOperativo));
                }).toList();
        return new BackfillLibroDiarioResponse(movimientos.size(), yaContabilizados, pendientes,
                omitidos, procesados, pendientes, conciliacion, conciliacionCuentas, motivos);
    }

    private void sumarSaldoCuenta(Map<Long, BigDecimal> saldosLibro, LineaAsiento linea) {
        BigDecimal impacto = linea.getLado() == LadoContable.DEBE ? linea.getMonto() : linea.getMonto().negate();
        saldosLibro.merge(linea.getCuentaFinancieraId(), impacto, BigDecimal::add);
    }

    private String motivoOmitido(RuntimeException error) {
        String mensaje = error.getMessage();
        return mensaje == null || mensaje.isBlank() ? "Movimiento no conciliable" : mensaje;
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
