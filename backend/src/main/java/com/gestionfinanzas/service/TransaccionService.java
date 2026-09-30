package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.TransaccionFiltroRequest;
import com.gestionfinanzas.dto.request.TransaccionRequest;
import com.gestionfinanzas.dto.response.TransaccionResponse;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.PlantillaRecurrente;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.FrecuenciaRecurrencia;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import com.gestionfinanzas.repository.specification.TransaccionSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TransaccionService {

    private final TransaccionRepository transaccionRepository;
    private final CuentaRepository cuentaRepository;
    private final CategoriaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;
    private final PlantillaRecurrenteRepository plantillaRepository;
    private final AuditoriaTransaccionService auditoriaService;
    private final LibroDiarioService libroDiarioService;

    @Transactional
    public TransaccionResponse crearTransaccion(Long usuarioId, TransaccionRequest request) {
        DatosTransaccion datos = prepararTransaccion(usuarioId, request);
        validarRecurrencia(request, datos.tipo());
        validarLimiteCredito(datos.cuentaOrigen(), datos.tipo(), request.monto(), null);

        BigDecimal montoGuardar = request.monto();
        boolean isMsi = request.msi() != null && request.msi() > 1;
        if (isMsi) {
            if (datos.tipo() != TipoTransaccion.GASTO || datos.cuentaOrigen().getTipo() != TipoCuenta.CREDITO) {
                throw new IllegalArgumentException("Los MSI solo aplican a gastos con tarjeta de crédito");
            }
            montoGuardar = request.monto().divide(BigDecimal.valueOf(request.msi()), 2, RoundingMode.HALF_UP);
            BigDecimal montoRetenido = request.monto().subtract(montoGuardar);
            datos.cuentaOrigen().setLimiteRetenido(
                    (datos.cuentaOrigen().getLimiteRetenido() != null ? datos.cuentaOrigen().getLimiteRetenido() : BigDecimal.ZERO).add(montoRetenido)
            );
            cuentaRepository.save(datos.cuentaOrigen());
        }

        aplicarImpacto(datos.tipo(), datos.cuentaOrigen(), datos.cuentaDestino(),
                montoGuardar, datos.montoDestino(), 1);

        Transaccion transaccion = Transaccion.builder()
                .usuario(datos.usuario())
                .cuenta(datos.cuentaOrigen())
                .cuentaDestino(datos.cuentaDestino())
                .cuentaNombreHistorico(datos.cuentaOrigen().getNombre())
                .cuentaMonedaHistorica(datos.cuentaOrigen().getMoneda())
                .cuentaDestinoNombreHistorico(datos.cuentaDestino() != null ? datos.cuentaDestino().getNombre() : null)
                .cuentaDestinoMonedaHistorica(datos.cuentaDestino() != null ? datos.cuentaDestino().getMoneda() : null)
                .categoria(datos.categoria())
                .tipo(request.tipo())
                .monto(montoGuardar)
                .montoDestino(datos.montoDestino())
                .tasaCambio(datos.tasaCambio())
                .fecha(request.fecha())
                .descripcion(descripcionMovimiento(datos, request.descripcion()) + (isMsi ? " (Cuota 1/" + request.msi() + ")" : ""))
                .notas(normalizarNotas(request.notas()))
                .build();

        Transaccion guardada = transaccionRepository.save(transaccion);
        libroDiarioService.registrarCreacion(usuarioId, TransaccionResponse.fromEntity(guardada));
        auditoriaService.registrar(usuarioId, guardada.getId(), "CREAR", null,
                TransaccionResponse.fromEntity(guardada));
        if (guardada.getTipo() == TipoTransaccion.GASTO) {
            recalcularCashbackMes(guardada.getCuenta(), guardada.getFecha());
        }
        
        if (isMsi) {
            plantillaRepository.save(PlantillaRecurrente.builder()
                    .usuario(datos.usuario())
                    .cuenta(datos.cuentaOrigen())
                    .categoria(datos.categoria())
                    .tipo(datos.tipo())
                    .monto(montoGuardar)
                    .notas(normalizarNotas(request.notas()))
                    .frecuencia(FrecuenciaRecurrencia.MENSUAL)
                    .siguienteFecha(request.fecha().plusMonths(1))
                    .cuotasTotales(request.msi() - 1)
                    .cuotasPagadas(0)
                    .build());
        } else if (request.frecuenciaRecurrencia() != null) {
            plantillaRepository.save(PlantillaRecurrente.builder()
                    .usuario(datos.usuario())
                    .cuenta(datos.cuentaOrigen())
                    .categoria(datos.categoria())
                    .tipo(datos.tipo())
                    .monto(request.monto())
                    .notas(normalizarNotas(request.notas()))
                    .frecuencia(request.frecuenciaRecurrencia())
                    .siguienteFecha(request.siguienteFechaRecurrencia())
                    .build());
        }
        return TransaccionResponse.fromEntity(guardada);
    }

    @Transactional
    public TransaccionResponse actualizarTransaccion(Long usuarioId, Long transaccionId, TransaccionRequest request) {
        Transaccion transaccion = transaccionRepository.findByIdAndUsuarioId(transaccionId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Transacción no encontrada o no autorizada"));
        if (transaccion.getTipo() == TipoTransaccion.SALDO_INICIAL) {
            throw new IllegalArgumentException("El saldo inicial no se puede editar");
        }
        if (transaccion.getCashbackOrigen() != null) {
            throw new IllegalArgumentException("El cashback automático no se puede editar");
        }
        if (transaccion.getCuenta() == null
                || (transaccion.getTipo() == TipoTransaccion.TRANSFERENCIA && transaccion.getCuentaDestino() == null)) {
            throw new IllegalArgumentException("No se puede editar un movimiento cuyo historial pertenece a una cuenta eliminada");
        }

        TransaccionResponse antes = TransaccionResponse.fromEntity(transaccion);
        Cuenta cuentaAnterior = transaccion.getCuenta();
        LocalDate fechaAnterior = transaccion.getFecha();
        TipoTransaccion tipoAnterior = transaccion.getTipo();
        DatosTransaccion datos = prepararTransaccion(usuarioId, request);
        validarLimiteCredito(datos.cuentaOrigen(), datos.tipo(), request.monto(), transaccion);
        if (tipoAnterior == TipoTransaccion.GASTO) {
            eliminarCashbackGenerado(transaccion);
        }
        aplicarImpacto(transaccion.getTipo(), transaccion.getCuenta(), transaccion.getCuentaDestino(),
                transaccion.getMonto(), transaccion.getMontoDestino(), -1);
        aplicarImpacto(datos.tipo(), datos.cuentaOrigen(), datos.cuentaDestino(),
                request.monto(), datos.montoDestino(), 1);

        transaccion.setCuenta(datos.cuentaOrigen());
        transaccion.setCuentaDestino(datos.cuentaDestino());
        transaccion.setCuentaNombreHistorico(datos.cuentaOrigen().getNombre());
        transaccion.setCuentaMonedaHistorica(datos.cuentaOrigen().getMoneda());
        transaccion.setCuentaDestinoNombreHistorico(datos.cuentaDestino() != null ? datos.cuentaDestino().getNombre() : null);
        transaccion.setCuentaDestinoMonedaHistorica(datos.cuentaDestino() != null ? datos.cuentaDestino().getMoneda() : null);
        transaccion.setCategoria(datos.categoria());
        transaccion.setTipo(request.tipo());
        transaccion.setMonto(request.monto());
        transaccion.setMontoDestino(datos.montoDestino());
        transaccion.setTasaCambio(datos.tasaCambio());
        transaccion.setFecha(request.fecha());
        transaccion.setDescripcion(descripcionMovimiento(datos, request.descripcion()));
        transaccion.setNotas(normalizarNotas(request.notas()));

        Transaccion actualizada = transaccionRepository.save(transaccion);
        libroDiarioService.registrarActualizacion(
                usuarioId, antes, TransaccionResponse.fromEntity(actualizada)
        );
        auditoriaService.registrar(usuarioId, actualizada.getId(), "ACTUALIZAR", antes,
                TransaccionResponse.fromEntity(actualizada));
        if (tipoAnterior == TipoTransaccion.GASTO) {
            recalcularCashbackMes(cuentaAnterior, fechaAnterior);
        }
        if (actualizada.getTipo() == TipoTransaccion.GASTO
                && (!cuentaAnterior.getId().equals(actualizada.getCuenta().getId())
                || !YearMonth.from(fechaAnterior).equals(YearMonth.from(actualizada.getFecha())))) {
            recalcularCashbackMes(actualizada.getCuenta(), actualizada.getFecha());
        } else if (tipoAnterior != TipoTransaccion.GASTO
                && actualizada.getTipo() == TipoTransaccion.GASTO) {
            recalcularCashbackMes(actualizada.getCuenta(), actualizada.getFecha());
        }
        return TransaccionResponse.fromEntity(actualizada);
    }

    private void validarLimiteCredito(
            Cuenta cuenta,
            TipoTransaccion tipo,
            BigDecimal monto,
            Transaccion transaccionAnterior
    ) {
        if ((tipo != TipoTransaccion.GASTO && tipo != TipoTransaccion.TRANSFERENCIA)
                || cuenta.getTipo() != TipoCuenta.CREDITO) {
            return;
        }

        BigDecimal limite = cuenta.getLimiteCredito();
        if (limite == null || limite.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Configura un límite de crédito válido antes de registrar gastos con esta tarjeta");
        }

        BigDecimal saldoProyectado = cuenta.getSaldoActual();
        if (transaccionAnterior != null) {
            if (transaccionAnterior.getCuenta().getId().equals(cuenta.getId())) {
                switch (transaccionAnterior.getTipo()) {
                    case GASTO, TRANSFERENCIA ->
                            saldoProyectado = saldoProyectado.add(transaccionAnterior.getMonto());
                    case INGRESO ->
                            saldoProyectado = saldoProyectado.subtract(transaccionAnterior.getMonto());
                    default -> {
                    }
                }
            }
            if (transaccionAnterior.getTipo() == TipoTransaccion.TRANSFERENCIA
                    && transaccionAnterior.getCuentaDestino() != null
                    && transaccionAnterior.getCuentaDestino().getId().equals(cuenta.getId())) {
                BigDecimal montoDestino = transaccionAnterior.getMontoDestino() != null
                        ? transaccionAnterior.getMontoDestino()
                        : transaccionAnterior.getMonto();
                saldoProyectado = saldoProyectado.subtract(montoDestino);
            }
            if (transaccionAnterior.getTipo() == TipoTransaccion.GASTO) {
                var cashback = transaccionRepository.findByCashbackOrigenId(transaccionAnterior.getId())
                        .filter(cashbackTransaccion -> cashbackTransaccion.getCuenta().getId().equals(cuenta.getId()));
                if (cashback.isPresent()) {
                    saldoProyectado = saldoProyectado.subtract(cashback.get().getMonto());
                }
            }
        }

        BigDecimal disponible = limite.add(saldoProyectado)
                .subtract(cuenta.getLimiteRetenido() != null ? cuenta.getLimiteRetenido() : BigDecimal.ZERO)
                .max(BigDecimal.ZERO).min(limite);
        if (monto.compareTo(disponible) > 0) {
            throw new IllegalArgumentException("El movimiento supera el crédito disponible de la tarjeta (" + disponible + ")");
        }
    }

    private DatosTransaccion prepararTransaccion(Long usuarioId, TransaccionRequest request) {
        if (request.tipo() == TipoTransaccion.SALDO_INICIAL) {
            throw new IllegalArgumentException("El saldo inicial solo se crea al registrar una cuenta");
        }

        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        Cuenta cuentaOrigen = cuentaRepository.findByIdAndUsuarioId(request.cuentaId(), usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("La cuenta origen no existe o no pertenece al usuario"));

        if (!cuentaOrigen.isActivo()) {
            throw new IllegalArgumentException("No se pueden registrar transacciones en una cuenta inactiva");
        }

        Categoria categoria = null;
        if (request.categoriaId() != null) {
            categoria = categoriaRepository.findAccessibleById(request.categoriaId(), usuarioId)
                    .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada o no accesible"));
            if (categoria.getTipo() != request.tipo()) {
                throw new IllegalArgumentException("La categoría debe corresponder al tipo de transacción");
            }
        }

        Cuenta cuentaDestino = null;
        BigDecimal montoDestino = null;
        BigDecimal tasaCambio = null;
        if (request.tipo() == TipoTransaccion.TRANSFERENCIA) {
            if (request.cuentaDestinoId() == null) {
                throw new IllegalArgumentException("Debe especificar la cuenta de destino para realizar una transferencia");
            }
            if (request.cuentaDestinoId().equals(request.cuentaId())) {
                throw new IllegalArgumentException("La cuenta de destino no puede ser la misma que la de origen");
            }

            cuentaDestino = cuentaRepository.findByIdAndUsuarioId(request.cuentaDestinoId(), usuarioId)
                    .orElseThrow(() -> new IllegalArgumentException("La cuenta de destino no existe o no pertenece al usuario"));

            if (cuentaOrigen.getTipo() == TipoCuenta.CREDITO && cuentaDestino.getTipo() == TipoCuenta.CREDITO) {
                throw new IllegalArgumentException("No se permiten transferencias entre tarjetas de crédito");
            }

            if (!cuentaDestino.isActivo()) {
                throw new IllegalArgumentException("La cuenta de destino se encuentra inactiva");
            }

            if (cuentaOrigen.getMoneda().equals(cuentaDestino.getMoneda())) {
                if (request.tasaCambio() != null && request.tasaCambio().compareTo(BigDecimal.ONE) != 0) {
                    throw new IllegalArgumentException("La tasa de cambio debe ser 1 cuando ambas cuentas usan la misma moneda");
                }
                tasaCambio = BigDecimal.ONE;
                montoDestino = request.monto().setScale(2, RoundingMode.HALF_UP);
            } else {
                if (request.tasaCambio() == null || request.tasaCambio().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new IllegalArgumentException("Indica una tasa de cambio mayor a 0 para transferir entre monedas distintas");
                }
                tasaCambio = request.tasaCambio();
                montoDestino = request.monto().multiply(tasaCambio).setScale(2, RoundingMode.HALF_UP);
                if (montoDestino.compareTo(BigDecimal.ZERO) <= 0 || montoDestino.precision() - montoDestino.scale() > 13) {
                    throw new IllegalArgumentException("El monto convertido debe ser mayor a 0 y no exceder el máximo permitido");
                }
            }

        }

        return new DatosTransaccion(usuario, cuentaOrigen, cuentaDestino, categoria,
                request.tipo(), montoDestino, tasaCambio);
    }

    private void validarRecurrencia(TransaccionRequest request, TipoTransaccion tipo) {
        if ((request.frecuenciaRecurrencia() == null) != (request.siguienteFechaRecurrencia() == null)) {
            throw new IllegalArgumentException("La frecuencia y la siguiente fecha recurrente deben indicarse juntas");
        }
        if (request.frecuenciaRecurrencia() == null) return;
        if (tipo == TipoTransaccion.TRANSFERENCIA) {
            throw new IllegalArgumentException("Las transferencias no se pueden programar como movimientos recurrentes");
        }
        if (!request.siguienteFechaRecurrencia().isAfter(request.fecha())) {
            throw new IllegalArgumentException("La siguiente fecha debe ser posterior a la fecha del movimiento");
        }
    }

    private String descripcionMovimiento(DatosTransaccion datos, String descripcionAnterior) {
        if (datos.categoria() != null) return datos.categoria().getNombre();
        if (datos.tipo() == TipoTransaccion.TRANSFERENCIA) return "Transferencia";
        return descripcionAnterior != null && !descripcionAnterior.isBlank()
                ? descripcionAnterior.trim()
                : (datos.tipo() == TipoTransaccion.INGRESO ? "Ingreso sin categoría" : "Gasto sin categoría");
    }

    private void aplicarImpacto(
            TipoTransaccion tipo,
            Cuenta cuentaOrigen,
            Cuenta cuentaDestino,
            BigDecimal monto,
            BigDecimal montoDestino,
            int factor
    ) {
        if (tipo == TipoTransaccion.GASTO) {
            cuentaOrigen.setSaldoActual(cuentaOrigen.getSaldoActual().subtract(monto.multiply(BigDecimal.valueOf(factor))));
            cuentaRepository.save(cuentaOrigen);
        } else if (tipo == TipoTransaccion.INGRESO) {
            cuentaOrigen.setSaldoActual(cuentaOrigen.getSaldoActual().add(monto.multiply(BigDecimal.valueOf(factor))));
            cuentaRepository.save(cuentaOrigen);
        } else if (tipo == TipoTransaccion.TRANSFERENCIA) {
            cuentaOrigen.setSaldoActual(cuentaOrigen.getSaldoActual().subtract(monto.multiply(BigDecimal.valueOf(factor))));
            cuentaDestino.setSaldoActual(cuentaDestino.getSaldoActual()
                    .add(montoDestino.multiply(BigDecimal.valueOf(factor))));
            cuentaRepository.save(cuentaOrigen);
            cuentaRepository.save(cuentaDestino);
        }
    }

    private void recalcularCashbackMes(Cuenta cuenta, LocalDate fecha) {
        BigDecimal porcentaje = cuenta.getCashbackPorcentaje();
        if (porcentaje == null || porcentaje.compareTo(BigDecimal.ZERO) <= 0) return;

        YearMonth mes = YearMonth.from(fecha);
        List<Transaccion> gastos = transaccionRepository.findByCuentaIdAndTipoAndFechaBetweenOrderByFechaAscIdAsc(
                cuenta.getId(), TipoTransaccion.GASTO, mes.atDay(1), mes.atEndOfMonth()
        );
        List<Transaccion> cashbackExistente =
                transaccionRepository.findByCuentaIdAndCashbackOrigenIsNotNullAndFechaBetweenOrderByFechaAscIdAsc(
                        cuenta.getId(), mes.atDay(1), mes.atEndOfMonth()
                );
        Map<Long, Transaccion> cashbackPorGasto = new HashMap<>();
        for (Transaccion cashback : cashbackExistente) {
            cashbackPorGasto.put(cashback.getCashbackOrigen().getId(), cashback);
        }

        BigDecimal cashbackAcumulado = BigDecimal.ZERO;
        BigDecimal cambioSaldo = BigDecimal.ZERO;
        for (Transaccion gasto : gastos) {
            BigDecimal montoCashback = gasto.getMonto()
                    .multiply(porcentaje)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal limiteMensual = cuenta.getCashbackLimiteMensual();
            if (limiteMensual != null) {
                BigDecimal restante = limiteMensual.subtract(cashbackAcumulado).max(BigDecimal.ZERO);
                montoCashback = montoCashback.min(restante);
            }

            Transaccion cashback = cashbackPorGasto.remove(gasto.getId());
            if (montoCashback.compareTo(BigDecimal.ZERO) == 0) {
                if (cashback != null) {
                    cambioSaldo = cambioSaldo.subtract(cashback.getMonto());
                    libroDiarioService.registrarEliminacion(
                            cashback.getUsuario().getId(), TransaccionResponse.fromEntity(cashback)
                    );
                    auditoriaService.registrar(gasto.getUsuario().getId(), cashback.getId(), "ELIMINAR",
                            TransaccionResponse.fromEntity(cashback), null);
                    transaccionRepository.delete(cashback);
                }
                continue;
            }

            cashbackAcumulado = cashbackAcumulado.add(montoCashback);
            if (cashback == null) {
                cashback = Transaccion.builder()
                        .usuario(gasto.getUsuario())
                        .cuenta(cuenta)
                        .tipo(TipoTransaccion.INGRESO)
                        .monto(montoCashback)
                        .fecha(gasto.getFecha())
                        .descripcion(descripcionCashback(gasto))
                        .notas("Estimación automática según la tasa configurada en esta cuenta.")
                        .cashbackOrigen(gasto)
                        .build();
                cambioSaldo = cambioSaldo.add(montoCashback);
                cashback = transaccionRepository.save(cashback);
                libroDiarioService.registrarCreacion(
                        gasto.getUsuario().getId(), TransaccionResponse.fromEntity(cashback)
                );
                auditoriaService.registrar(gasto.getUsuario().getId(), cashback.getId(), "CREAR", null,
                        TransaccionResponse.fromEntity(cashback));
            } else {
                TransaccionResponse antes = TransaccionResponse.fromEntity(cashback);
                cambioSaldo = cambioSaldo.add(montoCashback.subtract(cashback.getMonto()));
                cashback.setMonto(montoCashback);
                cashback.setFecha(gasto.getFecha());
                cashback.setDescripcion(descripcionCashback(gasto));
                Transaccion guardado = transaccionRepository.save(cashback);
                libroDiarioService.registrarActualizacion(
                        gasto.getUsuario().getId(), antes, TransaccionResponse.fromEntity(guardado)
                );
                auditoriaService.registrar(gasto.getUsuario().getId(), guardado.getId(), "ACTUALIZAR", antes,
                        TransaccionResponse.fromEntity(guardado));
            }
        }

        for (Transaccion cashbackObsoleto : cashbackPorGasto.values()) {
            cambioSaldo = cambioSaldo.subtract(cashbackObsoleto.getMonto());
            libroDiarioService.registrarEliminacion(
                    cashbackObsoleto.getUsuario().getId(), TransaccionResponse.fromEntity(cashbackObsoleto)
            );
            auditoriaService.registrar(cashbackObsoleto.getUsuario().getId(), cashbackObsoleto.getId(), "ELIMINAR",
                    TransaccionResponse.fromEntity(cashbackObsoleto), null);
            transaccionRepository.delete(cashbackObsoleto);
        }

        if (cambioSaldo.compareTo(BigDecimal.ZERO) != 0) {
            cuenta.setSaldoActual(cuenta.getSaldoActual().add(cambioSaldo));
            cuentaRepository.save(cuenta);
        }
    }

    private void eliminarCashbackGenerado(Transaccion gasto) {
        transaccionRepository.findByCashbackOrigenId(gasto.getId()).ifPresent(cashback -> {
            Cuenta cuenta = cashback.getCuenta();
            cuenta.setSaldoActual(cuenta.getSaldoActual().subtract(cashback.getMonto()));
            cuentaRepository.save(cuenta);
            libroDiarioService.registrarEliminacion(
                    cashback.getUsuario().getId(), TransaccionResponse.fromEntity(cashback)
            );
            auditoriaService.registrar(cashback.getUsuario().getId(), cashback.getId(), "ELIMINAR",
                    TransaccionResponse.fromEntity(cashback), null);
            transaccionRepository.delete(cashback);
        });
    }

    private String descripcionCashback(Transaccion gasto) {
        String prefijo = "Cashback · ";
        String descripcionGasto = gasto.getDescripcion();
        int maximoDescripcion = 200 - prefijo.length();
        String concepto = descripcionGasto.length() > maximoDescripcion
                ? descripcionGasto.substring(0, maximoDescripcion)
                : descripcionGasto;
        return prefijo + concepto;
    }

    private String normalizarNotas(String notas) {
        return notas != null && !notas.isBlank() ? notas.trim() : null;
    }

    private record DatosTransaccion(
            Usuario usuario,
            Cuenta cuentaOrigen,
            Cuenta cuentaDestino,
            Categoria categoria,
            TipoTransaccion tipo,
            BigDecimal montoDestino,
            BigDecimal tasaCambio
    ) {}

    @Transactional(readOnly = true)
    public List<TransaccionResponse> listarRecientes(Long usuarioId) {
        return transaccionRepository.findTop10ByUsuarioIdOrderByFechaDescIdDesc(usuarioId)
                .stream()
                .map(TransaccionResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<TransaccionResponse> listarPaginadas(Long usuarioId, Pageable pageable) {
        return listarConFiltros(usuarioId, null, pageable);
    }

    @Transactional(readOnly = true)
    public Page<TransaccionResponse> listarConFiltros(Long usuarioId, TransaccionFiltroRequest filtro, Pageable pageable) {
        Specification<Transaccion> spec = TransaccionSpecification.conFiltros(usuarioId, filtro);
        return transaccionRepository.findAll(spec, pageable)
                .map(TransaccionResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public String exportarCsv(Long usuarioId, TransaccionFiltroRequest filtro) {
        if (filtro != null && filtro.fechaInicio() != null && filtro.fechaFin() != null
                && filtro.fechaInicio().isAfter(filtro.fechaFin())) {
            throw new IllegalArgumentException("La fecha inicial no puede ser posterior a la fecha final");
        }

        Specification<Transaccion> spec = TransaccionSpecification.conFiltros(usuarioId, filtro);
        List<Transaccion> transacciones = transaccionRepository.findAll(
                spec, Sort.by(Sort.Direction.DESC, "fecha", "id")
        );
        StringBuilder csv = new StringBuilder("\uFEFF");
        csv.append("ID,Fecha,Tipo,Descripción,Categoría,Cuenta origen,Moneda origen,Monto origen,")
                .append("Cuenta destino,Moneda destino,Monto destino,Tasa de cambio,Notas\r\n");

        for (Transaccion transaccion : transacciones) {
            List<String> campos = new ArrayList<>(13);
            campos.add(transaccion.getId().toString());
            campos.add(transaccion.getFecha().toString());
            campos.add(transaccion.getTipo().name());
            campos.add(transaccion.getDescripcion());
            campos.add(transaccion.getCategoria() != null ? transaccion.getCategoria().getNombre() : "");
            campos.add(nombreCuentaOrigen(transaccion));
            campos.add(monedaCuentaOrigen(transaccion));
            campos.add(transaccion.getMonto().toPlainString());
            campos.add(nombreCuentaDestino(transaccion));
            campos.add(monedaCuentaDestino(transaccion));
            campos.add(transaccion.getMontoDestino() != null ? transaccion.getMontoDestino().toPlainString() : "");
            campos.add(transaccion.getTasaCambio() != null ? transaccion.getTasaCambio().toPlainString() : "");
            campos.add(transaccion.getNotas() != null ? transaccion.getNotas() : "");
            csv.append(campos.stream().map(TransaccionService::campoCsv).collect(java.util.stream.Collectors.joining(",")))
                    .append("\r\n");
        }
        return csv.toString();
    }

    private static String campoCsv(String valor) {
        String seguro = valor == null ? "" : valor;
        int primerCaracter = 0;
        while (primerCaracter < seguro.length()
                && (Character.isWhitespace(seguro.charAt(primerCaracter))
                || Character.isISOControl(seguro.charAt(primerCaracter)))) {
            primerCaracter++;
        }
        if (primerCaracter < seguro.length() && "=+-@".indexOf(seguro.charAt(primerCaracter)) >= 0) {
            seguro = "'" + seguro;
        }
        return "\"" + seguro.replace("\"", "\"\"") + "\"";
    }

    private String nombreCuentaOrigen(Transaccion transaccion) {
        return transaccion.getCuenta() != null
                ? transaccion.getCuenta().getNombre()
                : transaccion.getCuentaNombreHistorico();
    }

    private String monedaCuentaOrigen(Transaccion transaccion) {
        return transaccion.getCuenta() != null
                ? transaccion.getCuenta().getMoneda()
                : transaccion.getCuentaMonedaHistorica();
    }

    private String nombreCuentaDestino(Transaccion transaccion) {
        return transaccion.getCuentaDestino() != null
                ? transaccion.getCuentaDestino().getNombre()
                : transaccion.getCuentaDestinoNombreHistorico();
    }

    private String monedaCuentaDestino(Transaccion transaccion) {
        return transaccion.getCuentaDestino() != null
                ? transaccion.getCuentaDestino().getMoneda()
                : transaccion.getCuentaDestinoMonedaHistorica();
    }

    @Transactional(readOnly = true)
    public TransaccionResponse obtenerPorId(Long usuarioId, Long transaccionId) {
        Transaccion transaccion = transaccionRepository.findByIdAndUsuarioId(transaccionId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Transacción no encontrada o no autorizada"));
        return TransaccionResponse.fromEntity(transaccion);
    }

    @Transactional
    public void eliminarTransaccion(Long usuarioId, Long transaccionId) {
        Transaccion transaccion = transaccionRepository.findByIdAndUsuarioId(transaccionId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Transacción no encontrada o no autorizada"));
        TransaccionResponse antes = TransaccionResponse.fromEntity(transaccion);
        if (transaccion.getCashbackOrigen() != null) {
            throw new IllegalArgumentException("El cashback automático se elimina junto con el gasto que lo generó");
        }
        if (transaccion.getCuenta() == null
                || (transaccion.getTipo() == TipoTransaccion.TRANSFERENCIA && transaccion.getCuentaDestino() == null)) {
            throw new IllegalArgumentException("No se puede eliminar un movimiento cuyo historial pertenece a una cuenta eliminada");
        }

        Cuenta cuentaOrigen = transaccion.getCuenta();
        LocalDate fechaGastoEliminado = transaccion.getFecha();
        boolean eraGasto = transaccion.getTipo() == TipoTransaccion.GASTO;
        if (eraGasto) {
            eliminarCashbackGenerado(transaccion);
        }

        // Revertir el impacto en los balances según el tipo original
        if (transaccion.getTipo() == TipoTransaccion.GASTO) {
            cuentaOrigen.setSaldoActual(cuentaOrigen.getSaldoActual().add(transaccion.getMonto()));
            cuentaRepository.save(cuentaOrigen);

        } else if (transaccion.getTipo() == TipoTransaccion.INGRESO) {
            cuentaOrigen.setSaldoActual(cuentaOrigen.getSaldoActual().subtract(transaccion.getMonto()));
            cuentaRepository.save(cuentaOrigen);

        } else if (transaccion.getTipo() == TipoTransaccion.TRANSFERENCIA) {
            cuentaOrigen.setSaldoActual(cuentaOrigen.getSaldoActual().add(transaccion.getMonto()));
            cuentaRepository.save(cuentaOrigen);

            if (transaccion.getCuentaDestino() != null) {
                Cuenta cuentaDestino = transaccion.getCuentaDestino();
                BigDecimal montoDestino = transaccion.getMontoDestino() != null
                        ? transaccion.getMontoDestino()
                        : transaccion.getMonto();
                cuentaDestino.setSaldoActual(cuentaDestino.getSaldoActual().subtract(montoDestino));
                cuentaRepository.save(cuentaDestino);
            }
        } else if (transaccion.getTipo() == TipoTransaccion.SALDO_INICIAL) {
            // El saldo inicial guarda el monto en positivo, pero al abrir la cuenta se aplico
            // con el signo del tipo de cuenta: en una tarjeta de credito se resto, porque una
            // deuda es un saldo negativo. Por eso deshacerlo no siempre es restar: si se
            // hiciera siempre, una deuda de 100 passaria a 200 en vez de volver a cero.
            BigDecimal ajuste = cuentaOrigen.getTipo() == TipoCuenta.CREDITO
                    ? transaccion.getMonto()
                    : transaccion.getMonto().negate();
            cuentaOrigen.setSaldoActual(cuentaOrigen.getSaldoActual().add(ajuste));
            cuentaRepository.save(cuentaOrigen);
        }

        libroDiarioService.registrarEliminacion(usuarioId, antes);
        auditoriaService.registrar(usuarioId, transaccion.getId(), "ELIMINAR", antes, null);
        transaccionRepository.delete(transaccion);
        if (eraGasto) {
            recalcularCashbackMes(cuentaOrigen, fechaGastoEliminado);
        }
    }
}
