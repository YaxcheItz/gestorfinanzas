package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.TransaccionFiltroRequest;
import com.gestionfinanzas.dto.request.TransaccionRequest;
import com.gestionfinanzas.dto.response.TransaccionResponse;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import com.gestionfinanzas.repository.specification.TransaccionSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransaccionService {

    private final TransaccionRepository transaccionRepository;
    private final CuentaRepository cuentaRepository;
    private final CategoriaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional
    public TransaccionResponse crearTransaccion(Long usuarioId, TransaccionRequest request) {
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

            // Aplicar matemática de balance para transferencia
            cuentaOrigen.setSaldoActual(cuentaOrigen.getSaldoActual().subtract(request.monto()));
            cuentaDestino.setSaldoActual(cuentaDestino.getSaldoActual().add(montoDestino));
            cuentaRepository.save(cuentaOrigen);
            cuentaRepository.save(cuentaDestino);

        } else if (request.tipo() == TipoTransaccion.GASTO) {
            cuentaOrigen.setSaldoActual(cuentaOrigen.getSaldoActual().subtract(request.monto()));
            cuentaRepository.save(cuentaOrigen);

        } else if (request.tipo() == TipoTransaccion.INGRESO) {
            cuentaOrigen.setSaldoActual(cuentaOrigen.getSaldoActual().add(request.monto()));
            cuentaRepository.save(cuentaOrigen);
        }

        Transaccion transaccion = Transaccion.builder()
                .usuario(usuario)
                .cuenta(cuentaOrigen)
                .cuentaDestino(cuentaDestino)
                .categoria(categoria)
                .tipo(request.tipo())
                .monto(request.monto())
                .montoDestino(montoDestino)
                .tasaCambio(tasaCambio)
                .fecha(request.fecha())
                .descripcion(request.descripcion().trim())
                .notas(request.notas() != null && !request.notas().isBlank() ? request.notas().trim() : null)
                .build();

        Transaccion guardada = transaccionRepository.save(transaccion);
        return TransaccionResponse.fromEntity(guardada);
    }

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
    public TransaccionResponse obtenerPorId(Long usuarioId, Long transaccionId) {
        Transaccion transaccion = transaccionRepository.findByIdAndUsuarioId(transaccionId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Transacción no encontrada o no autorizada"));
        return TransaccionResponse.fromEntity(transaccion);
    }

    @Transactional
    public void eliminarTransaccion(Long usuarioId, Long transaccionId) {
        Transaccion transaccion = transaccionRepository.findByIdAndUsuarioId(transaccionId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Transacción no encontrada o no autorizada"));

        Cuenta cuentaOrigen = transaccion.getCuenta();

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
            cuentaOrigen.setSaldoActual(cuentaOrigen.getSaldoActual().subtract(transaccion.getMonto()));
            cuentaRepository.save(cuentaOrigen);
        }

        transaccionRepository.delete(transaccion);
    }
}
