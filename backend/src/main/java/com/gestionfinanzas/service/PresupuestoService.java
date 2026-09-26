package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.PresupuestoRequest;
import com.gestionfinanzas.dto.response.PresupuestoResponse;
import com.gestionfinanzas.dto.response.PresupuestoResumenResponse;
import com.gestionfinanzas.dto.response.PresupuestoMonedaResumenResponse;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Presupuesto;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.PresupuestoRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class PresupuestoService {

    private final PresupuestoRepository presupuestoRepository;
    private final CategoriaRepository categoriaRepository;
    private final TransaccionRepository transaccionRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional
    public PresupuestoResponse crearOActualizarPresupuesto(Long usuarioId, PresupuestoRequest request) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        Optional<Presupuesto> existente = presupuestoRepository.findByUsuarioIdAndCategoriaIdAndMesAndAnio(
                usuarioId, request.categoriaId(), request.mes(), request.anio()
        );

        Presupuesto presupuesto;
        Categoria categoria;
        if (existente.isPresent()) {
            presupuesto = existente.get();
            categoria = presupuesto.getCategoria();
            presupuesto.setMontoLimite(request.montoLimite());
            presupuesto.setMoneda(normalizarMoneda(request.moneda()));
        } else {
            categoria = categoriaRepository.findAccessibleById(request.categoriaId(), usuarioId)
                    .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada o no accesible"));
            presupuesto = Presupuesto.builder()
                    .usuario(usuario)
                    .categoria(categoria)
                    .montoLimite(request.montoLimite())
                    .moneda(normalizarMoneda(request.moneda()))
                    .mes(request.mes())
                    .anio(request.anio())
                    .build();
        }
        if (categoria.getTipo() != TipoTransaccion.GASTO) {
            throw new IllegalArgumentException("Los presupuestos solo pueden asignarse a categorías de gasto");
        }

        Presupuesto guardado = presupuestoRepository.save(presupuesto);
        return calcularMetricasPresupuesto(guardado, usuarioId);
    }

    @Transactional(readOnly = true)
    public PresupuestoResumenResponse obtenerResumenPeriodo(Long usuarioId, Integer mes, Integer anio) {
        LocalDate hoy = LocalDate.now();
        int mesConsulta = (mes != null && mes >= 1 && mes <= 12) ? mes : hoy.getMonthValue();
        int anioConsulta = (anio != null && anio >= 2000 && anio <= 2100) ? anio : hoy.getYear();

        List<Presupuesto> presupuestos = presupuestoRepository.findByUsuarioIdAndMesAndAnio(
                usuarioId, mesConsulta, anioConsulta
        );

        List<PresupuestoResponse> responses = new ArrayList<>();
        Map<String, BigDecimal[]> totalesPorMoneda = new TreeMap<>();

        for (Presupuesto p : presupuestos) {
            PresupuestoResponse resp = calcularMetricasPresupuesto(p, usuarioId);
            responses.add(resp);
            BigDecimal[] totales = totalesPorMoneda.computeIfAbsent(
                    resp.moneda(), ignored -> new BigDecimal[] { BigDecimal.ZERO, BigDecimal.ZERO }
            );
            totales[0] = totales[0].add(resp.montoLimite());
            totales[1] = totales[1].add(resp.montoGastado());
        }

        List<PresupuestoMonedaResumenResponse> resumenPorMoneda = totalesPorMoneda.entrySet().stream()
                .map(entry -> {
                    BigDecimal presupuesto = entry.getValue()[0];
                    BigDecimal gasto = entry.getValue()[1];
                    BigDecimal disponible = presupuesto.subtract(gasto);
                    BigDecimal porcentaje = presupuesto.signum() > 0
                            ? gasto.multiply(BigDecimal.valueOf(100)).divide(presupuesto, 2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;
                    return new PresupuestoMonedaResumenResponse(
                            entry.getKey(), presupuesto, gasto, disponible, porcentaje
                    );
                })
                .toList();
        PresupuestoMonedaResumenResponse resumenMxn = resumenPorMoneda.stream()
                .filter(resumen -> "MXN".equals(resumen.moneda()))
                .findFirst()
                .orElse(new PresupuestoMonedaResumenResponse(
                        "MXN", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO
                ));

        return new PresupuestoResumenResponse(
                mesConsulta,
                anioConsulta,
                resumenMxn.totalPresupuestado(),
                resumenMxn.totalGastado(),
                resumenMxn.totalDisponible(),
                resumenMxn.porcentajeConsumido(),
                responses,
                resumenPorMoneda
        );
    }

    @Transactional
    public void eliminarPresupuesto(Long usuarioId, Long id) {
        Presupuesto presupuesto = presupuestoRepository.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Presupuesto no encontrado o no autorizado"));
        presupuestoRepository.delete(presupuesto);
    }

    private PresupuestoResponse calcularMetricasPresupuesto(Presupuesto p, Long usuarioId) {
        LocalDate inicioPeriodo = LocalDate.of(p.getAnio(), p.getMes(), 1);
        LocalDate finPeriodo = inicioPeriodo.withDayOfMonth(inicioPeriodo.lengthOfMonth());

        BigDecimal montoGastado = transaccionRepository.sumGastosPorUsuarioYCategoriaYPeriodo(
                usuarioId, p.getCategoria().getId(), p.getMoneda(), inicioPeriodo, finPeriodo
        );
        if (montoGastado == null) {
            montoGastado = BigDecimal.ZERO;
        }

        BigDecimal montoDisponible = p.getMontoLimite().subtract(montoGastado);

        BigDecimal porcentajeConsumido = BigDecimal.ZERO;
        if (p.getMontoLimite().compareTo(BigDecimal.ZERO) > 0) {
            porcentajeConsumido = montoGastado.multiply(BigDecimal.valueOf(100))
                    .divide(p.getMontoLimite(), 2, RoundingMode.HALF_UP);
        }

        String estado = "NORMAL";
        if (porcentajeConsumido.compareTo(BigDecimal.valueOf(100)) >= 0) {
            estado = "EXCEDIDO";
        } else if (porcentajeConsumido.compareTo(BigDecimal.valueOf(80)) >= 0) {
            estado = "ALERTA";
        }

        return PresupuestoResponse.of(p, montoGastado, montoDisponible, porcentajeConsumido, estado);
    }

    private String normalizarMoneda(String moneda) {
        return moneda == null || moneda.isBlank() ? "MXN" : moneda.trim().toUpperCase();
    }
}
