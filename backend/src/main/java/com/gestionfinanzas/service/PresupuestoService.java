package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.PresupuestoRequest;
import com.gestionfinanzas.dto.response.PresupuestoResponse;
import com.gestionfinanzas.dto.response.PresupuestoResumenResponse;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Presupuesto;
import com.gestionfinanzas.model.entity.Usuario;
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

        Categoria categoria = categoriaRepository.findAccessibleById(request.categoriaId(), usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada o no accesible"));

        Optional<Presupuesto> existente = presupuestoRepository.findByUsuarioIdAndCategoriaIdAndMesAndAnio(
                usuarioId, request.categoriaId(), request.mes(), request.anio()
        );

        Presupuesto presupuesto;
        if (existente.isPresent()) {
            presupuesto = existente.get();
            presupuesto.setMontoLimite(request.montoLimite());
        } else {
            presupuesto = Presupuesto.builder()
                    .usuario(usuario)
                    .categoria(categoria)
                    .montoLimite(request.montoLimite())
                    .mes(request.mes())
                    .anio(request.anio())
                    .build();
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

        BigDecimal totalPresupuestado = BigDecimal.ZERO;
        BigDecimal totalGastado = BigDecimal.ZERO;
        List<PresupuestoResponse> responses = new ArrayList<>();

        for (Presupuesto p : presupuestos) {
            PresupuestoResponse resp = calcularMetricasPresupuesto(p, usuarioId);
            totalPresupuestado = totalPresupuestado.add(resp.montoLimite());
            totalGastado = totalGastado.add(resp.montoGastado());
            responses.add(resp);
        }

        BigDecimal totalDisponible = totalPresupuestado.subtract(totalGastado);
        BigDecimal porcentajeConsumidoGlobal = BigDecimal.ZERO;
        if (totalPresupuestado.compareTo(BigDecimal.ZERO) > 0) {
            porcentajeConsumidoGlobal = totalGastado.multiply(BigDecimal.valueOf(100))
                    .divide(totalPresupuestado, 2, RoundingMode.HALF_UP);
        }

        return new PresupuestoResumenResponse(
                mesConsulta,
                anioConsulta,
                totalPresupuestado,
                totalGastado,
                totalDisponible,
                porcentajeConsumidoGlobal,
                responses
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
                usuarioId, p.getCategoria().getId(), inicioPeriodo, finPeriodo
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
}
