package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.CuentaRequest;
import com.gestionfinanzas.dto.response.CuentaResponse;
import com.gestionfinanzas.dto.response.TransaccionResponse;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CuentaService {

    private final CuentaRepository cuentaRepository;
    private final UsuarioRepository usuarioRepository;
    private final TransaccionRepository transaccionRepository;
    private final PlantillaRecurrenteRepository plantillaRepository;
    private final AuditoriaTransaccionService auditoriaService;
    private final LibroDiarioService libroDiarioService;

    private static final Set<String> MONEDAS_DISPONIBLES = Set.of("MXN", "USD", "CAD", "EUR", "GBP");

    @Transactional(readOnly = true)
    public List<CuentaResponse> listarCuentas(Long usuarioId, boolean incluirInactivas) {
        return cuentaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuarioId)
                .stream()
                .filter(cuenta -> incluirInactivas || cuenta.isActivo())
                .map(CuentaResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public CuentaResponse obtenerCuenta(Long usuarioId, Long cuentaId) {
        Cuenta cuenta = cuentaRepository.findByIdAndUsuarioId(cuentaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Cuenta no encontrada o no autorizada"));
        return CuentaResponse.fromEntity(cuenta);
    }

    @Transactional
    public CuentaResponse crearCuenta(Long usuarioId, CuentaRequest request) {
        validarConfiguracionCredito(request);
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        if (request.tipo() == TipoCuenta.EFECTIVO && cuentaRepository.existsByUsuarioIdAndTipo(usuarioId, TipoCuenta.EFECTIVO)) {
            throw new IllegalArgumentException("Ya tienes una cuenta de Efectivo, solo se permite una.");
        }

        String nombreTrim = request.nombre().trim();
        if (cuentaRepository.existsByUsuarioIdAndNombreIgnoreCase(usuarioId, nombreTrim)) {
            throw new IllegalArgumentException("Ya existe una cuenta con el nombre '" + nombreTrim + "'");
        }

        BigDecimal saldoInicial = request.saldoInicial() != null ? request.saldoInicial() : BigDecimal.ZERO;
        if (request.tipo() == TipoCuenta.CREDITO) {
            saldoInicial = saldoInicial.negate();
        }
        String moneda = normalizarMoneda(request.moneda());

        Cuenta cuenta = Cuenta.builder()
                .usuario(usuario)
                .nombre(nombreTrim)
                .tipo(request.tipo())
                .institucionFinanciera(normalizarInstitucion(request.institucionFinanciera()))
                .cashbackPorcentaje(cashbackPorcentaje(request))
                .cashbackLimiteMensual(request.cashbackLimiteMensual())
                .limiteCredito(request.limiteCredito())
                .diaCorte(request.diaCorte())
                .diaPago(request.diaPago())
                .saldoActual(saldoInicial)
                .moneda(moneda)
                .descripcion(request.descripcion() != null ? request.descripcion().trim() : null)
                .activo(true)
                .build();

        Cuenta guardada = cuentaRepository.save(cuenta);
        if (saldoInicial.abs().compareTo(BigDecimal.ZERO) > 0) {
            Transaccion saldoInicialRegistrado = transaccionRepository.save(Transaccion.builder()
                    .usuario(usuario)
                    .cuenta(guardada)
                    .tipo(TipoTransaccion.SALDO_INICIAL)
                    .monto(saldoInicial.abs())
                    .fecha(LocalDate.now())
                    .descripcion("Saldo inicial")
                    .build());
            var movimientoInicial = TransaccionResponse.fromEntity(saldoInicialRegistrado);
            libroDiarioService.registrarSaldoInicial(
                    usuarioId, movimientoInicial, guardada.getSaldoActual().signum() < 0
            );
            auditoriaService.registrar(usuarioId, saldoInicialRegistrado.getId(), "CREAR", null,
                    movimientoInicial);
        }
        return CuentaResponse.fromEntity(guardada);
    }

    @Transactional
    public CuentaResponse actualizarCuenta(Long usuarioId, Long cuentaId, CuentaRequest request) {
        Cuenta cuenta = cuentaRepository.findByIdAndUsuarioId(cuentaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Cuenta no encontrada o no autorizada"));
        if (request.tipo() != cuenta.getTipo()) {
            throw new IllegalArgumentException("No se puede cambiar el tipo de una cuenta existente");
        }
        if (!Objects.equals(
                normalizarInstitucion(request.institucionFinanciera()),
                normalizarInstitucion(cuenta.getInstitucionFinanciera()))) {
            throw new IllegalArgumentException("No se puede cambiar la institución de una cuenta existente");
        }
        validarConfiguracionCredito(request);

        String nombreTrim = request.nombre().trim();
        if (!cuenta.getNombre().equalsIgnoreCase(nombreTrim) 
                && cuentaRepository.existsByUsuarioIdAndNombreIgnoreCase(usuarioId, nombreTrim)) {
            throw new IllegalArgumentException("Ya existe otra cuenta con el nombre '" + nombreTrim + "'");
        }
        String nuevaMoneda = normalizarMoneda(request.moneda());
        if (!cuenta.getMoneda().equals(nuevaMoneda)
                && (cuenta.getSaldoActual().compareTo(BigDecimal.ZERO) != 0
                || transaccionRepository.existsByCuentaIdOrCuentaDestinoId(cuentaId, cuentaId))) {
            throw new IllegalArgumentException("No se puede cambiar la moneda de una cuenta con saldo o movimientos registrados");
        }
        if (request.tipo() == TipoCuenta.CREDITO) {
            validarLimiteContraDeuda(request.limiteCredito(), cuenta.getSaldoActual().negate().max(BigDecimal.ZERO));
        }

        cuenta.setNombre(nombreTrim);
        cuenta.setTipo(request.tipo());
        cuenta.setInstitucionFinanciera(normalizarInstitucion(request.institucionFinanciera()));
        cuenta.setCashbackPorcentaje(cashbackPorcentaje(request));
        cuenta.setCashbackLimiteMensual(request.cashbackLimiteMensual());
        cuenta.setLimiteCredito(request.limiteCredito());
        cuenta.setDiaCorte(request.diaCorte());
        cuenta.setDiaPago(request.diaPago());
        cuenta.setMoneda(nuevaMoneda);
        cuenta.setDescripcion(request.descripcion() != null ? request.descripcion().trim() : null);

        Cuenta actualizada = cuentaRepository.save(cuenta);
        return CuentaResponse.fromEntity(actualizada);
    }

    private String normalizarInstitucion(String institucionFinanciera) {
        if (institucionFinanciera == null || institucionFinanciera.isBlank()) return null;
        return institucionFinanciera.trim();
    }

    private void validarConfiguracionCredito(CuentaRequest request) {
        if (request.tipo() == TipoCuenta.CREDITO) {
            if (request.limiteCredito() == null) {
                throw new IllegalArgumentException("El límite de crédito es obligatorio para una tarjeta de crédito");
            }
            if (request.limiteCredito().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("El límite de crédito debe ser mayor a 0");
            }
            if (request.diaCorte() == null) {
                throw new IllegalArgumentException("El día de corte es obligatorio para una tarjeta de crédito");
            }
            if (request.diaPago() == null) {
                throw new IllegalArgumentException("El día de pago es obligatorio para una tarjeta de crédito");
            }
            validarDia(request.diaCorte(), "corte");
            validarDia(request.diaPago(), "pago");
            if (request.saldoInicial() != null) {
                validarLimiteContraDeuda(request.limiteCredito(), request.saldoInicial());
            }
        } else if (request.limiteCredito() != null || request.diaCorte() != null || request.diaPago() != null) {
            throw new IllegalArgumentException("Los datos de crédito solo se permiten en tarjetas de crédito");
        }
    }

    private void validarDia(Integer dia, String nombre) {
        if (dia != null && (dia < 1 || dia > 31)) {
            throw new IllegalArgumentException("El día de " + nombre + " debe estar entre 1 y 31");
        }
    }

    private BigDecimal cashbackPorcentaje(CuentaRequest request) {
        return request.tipo() == TipoCuenta.CREDITO && request.cashbackPorcentaje() == null
                ? BigDecimal.ZERO
                : request.cashbackPorcentaje();
    }

    private void validarLimiteContraDeuda(BigDecimal limiteCredito, BigDecimal deuda) {
        if (limiteCredito.compareTo(deuda) < 0) {
            throw new IllegalArgumentException("El límite de crédito no puede ser menor que la deuda actual");
        }
    }

    @Transactional
    public void eliminarCuenta(Long usuarioId, Long cuentaId) {
        Cuenta cuenta = cuentaRepository.findByIdAndUsuarioId(cuentaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Cuenta no encontrada o no autorizada"));
        if (cuenta.getSaldoActual().compareTo(BigDecimal.ZERO) != 0) {
            throw new IllegalArgumentException("La cuenta debe tener saldo 0 para poder eliminarse. Transfiere el dinero o liquida la deuda primero");
        }

        List<Transaccion> transacciones =
                transaccionRepository.findByCuentaIdOrCuentaDestinoId(cuentaId, cuentaId);
        for (var transaccion : transacciones) {
            if (transaccion.getCuenta() != null && Objects.equals(transaccion.getCuenta().getId(), cuentaId)) {
                transaccion.setCuentaNombreHistorico(cuenta.getNombre());
                transaccion.setCuentaMonedaHistorica(cuenta.getMoneda());
                transaccion.setCuenta(null);
            }
            if (transaccion.getCuentaDestino() != null
                    && Objects.equals(transaccion.getCuentaDestino().getId(), cuentaId)) {
                transaccion.setCuentaDestinoNombreHistorico(cuenta.getNombre());
                transaccion.setCuentaDestinoMonedaHistorica(cuenta.getMoneda());
                transaccion.setCuentaDestino(null);
            }
        }
        transaccionRepository.saveAll(transacciones);
        plantillaRepository.deleteByCuentaId(cuentaId);
        cuentaRepository.delete(cuenta);
    }

    @Transactional
    public void desactivarCuenta(Long usuarioId, Long cuentaId) {
        Cuenta cuenta = cuentaRepository.findByIdAndUsuarioId(cuentaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Cuenta no encontrada o no autorizada"));
        cuenta.setActivo(false);
        cuentaRepository.save(cuenta);
    }

    @Transactional
    public void reactivarCuenta(Long usuarioId, Long cuentaId) {
        Cuenta cuenta = cuentaRepository.findByIdAndUsuarioId(cuentaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Cuenta no encontrada o no autorizada"));
        cuenta.setActivo(true);
        cuentaRepository.save(cuenta);
    }

    @Transactional
    public Cuenta crearCuentaPredeterminada(Usuario usuario) {
        Cuenta cuentaInicial = Cuenta.builder()
                .usuario(usuario)
                .nombre("Billetera / Efectivo")
                .tipo(TipoCuenta.EFECTIVO)
                .saldoActual(BigDecimal.ZERO)
                .moneda("MXN")
                .descripcion("Cuenta predeterminada de efectivo")
                .activo(true)
                .build();

        return cuentaRepository.save(cuentaInicial);
    }

    private String normalizarMoneda(String monedaSolicitada) {
        String moneda = monedaSolicitada == null || monedaSolicitada.isBlank()
                ? "MXN"
                : monedaSolicitada.trim().toUpperCase();
        if (!MONEDAS_DISPONIBLES.contains(moneda)) {
            throw new IllegalArgumentException("Moneda no soportada. Usa MXN, USD, CAD, EUR o GBP");
        }
        return moneda;
    }
}
