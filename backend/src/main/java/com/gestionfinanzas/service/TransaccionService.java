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
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransaccionService {

    private final TransaccionRepository transaccionRepository;
    private final CuentaRepository cuentaRepository;
    private final CategoriaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;
    private final PlantillaRecurrenteRepository plantillaRepository;

    @Transactional
    public TransaccionResponse crearTransaccion(Long usuarioId, TransaccionRequest request) {
        DatosTransaccion datos = prepararTransaccion(usuarioId, request);
        validarRecurrencia(request, datos.tipo());
        aplicarImpacto(datos.tipo(), datos.cuentaOrigen(), datos.cuentaDestino(),
                request.monto(), datos.montoDestino(), 1);

        Transaccion transaccion = Transaccion.builder()
                .usuario(datos.usuario())
                .cuenta(datos.cuentaOrigen())
                .cuentaDestino(datos.cuentaDestino())
                .categoria(datos.categoria())
                .tipo(request.tipo())
                .monto(request.monto())
                .montoDestino(datos.montoDestino())
                .tasaCambio(datos.tasaCambio())
                .fecha(request.fecha())
                .descripcion(descripcionMovimiento(datos, request.descripcion()))
                .notas(normalizarNotas(request.notas()))
                .build();

        Transaccion guardada = transaccionRepository.save(transaccion);
        if (request.frecuenciaRecurrencia() != null) {
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

        DatosTransaccion datos = prepararTransaccion(usuarioId, request);
        aplicarImpacto(transaccion.getTipo(), transaccion.getCuenta(), transaccion.getCuentaDestino(),
                transaccion.getMonto(), transaccion.getMontoDestino(), -1);
        aplicarImpacto(datos.tipo(), datos.cuentaOrigen(), datos.cuentaDestino(),
                request.monto(), datos.montoDestino(), 1);

        transaccion.setCuenta(datos.cuentaOrigen());
        transaccion.setCuentaDestino(datos.cuentaDestino());
        transaccion.setCategoria(datos.categoria());
        transaccion.setTipo(request.tipo());
        transaccion.setMonto(request.monto());
        transaccion.setMontoDestino(datos.montoDestino());
        transaccion.setTasaCambio(datos.tasaCambio());
        transaccion.setFecha(request.fecha());
        transaccion.setDescripcion(descripcionMovimiento(datos, request.descripcion()));
        transaccion.setNotas(normalizarNotas(request.notas()));

        return TransaccionResponse.fromEntity(transaccionRepository.save(transaccion));
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
            campos.add(transaccion.getCuenta().getNombre());
            campos.add(transaccion.getCuenta().getMoneda());
            campos.add(transaccion.getMonto().toPlainString());
            campos.add(transaccion.getCuentaDestino() != null ? transaccion.getCuentaDestino().getNombre() : "");
            campos.add(transaccion.getCuentaDestino() != null ? transaccion.getCuentaDestino().getMoneda() : "");
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
