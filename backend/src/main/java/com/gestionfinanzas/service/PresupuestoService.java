package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.PresupuestoRequest;
import com.gestionfinanzas.dto.response.*;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.ListaFinanciera;
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
import java.util.*;

@Service
@RequiredArgsConstructor
public class PresupuestoService {

    private final PresupuestoRepository presupuestoRepository;
    private final CategoriaRepository categoriaRepository;
    private final TransaccionRepository transaccionRepository;
    private final UsuarioRepository usuarioRepository;
    private final ListaService listaService;

    @Transactional
    public PresupuestoResponse crearOActualizarPresupuesto(Long usuarioId, PresupuestoRequest request) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        ListaFinanciera lista = listaService.escribir(usuarioId, request.listaId());
        Long listaIdEfectivo = lista != null ? lista.getId() : null;

        Optional<Presupuesto> existente = (listaIdEfectivo != null)
                ? presupuestoRepository.findByUsuarioIdAndCategoriaIdAndMesAndAnioAndListaId(
                        usuarioId, request.categoriaId(), request.mes(), request.anio(), listaIdEfectivo)
                : presupuestoRepository.findByUsuarioIdAndCategoriaIdAndMesAndAnioAndListaIsNull(
                        usuarioId, request.categoriaId(), request.mes(), request.anio());

        // Solo adoptar un presupuesto legado sin lista; nunca uno de otra lista.
        if (existente.isEmpty() && request.listaId() == null && listaIdEfectivo != null) {
            existente = presupuestoRepository.findByUsuarioIdAndCategoriaIdAndMesAndAnioAndListaIsNull(
                    usuarioId, request.categoriaId(), request.mes(), request.anio());
        }

        int porcentajeAlerta = (request.porcentajeAlerta() != null && request.porcentajeAlerta() >= 1 && request.porcentajeAlerta() <= 100)
                ? request.porcentajeAlerta() : 80;

        Presupuesto presupuesto;
        Categoria categoria;
        if (existente.isPresent()) {
            presupuesto = existente.get();
            categoria = presupuesto.getCategoria();
            presupuesto.setMontoLimite(request.montoLimite());
            presupuesto.setMoneda(normalizarMoneda(request.moneda()));
            presupuesto.setPorcentajeAlerta(porcentajeAlerta);
            if (lista != null) {
                presupuesto.setLista(lista);
            }
        } else {
            categoria = categoriaRepository.findAccessibleById(request.categoriaId(), usuarioId)
                    .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada o no accesible"));
            presupuesto = Presupuesto.builder()
                    .usuario(usuario)
                    .categoria(categoria)
                    .lista(lista)
                    .montoLimite(request.montoLimite())
                    .moneda(normalizarMoneda(request.moneda()))
                    .porcentajeAlerta(porcentajeAlerta)
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
        return obtenerResumenPeriodo(usuarioId, null, mes, anio);
    }

    @Transactional(readOnly = true)
    public PresupuestoResumenResponse obtenerResumenPeriodo(Long usuarioId, Long listaId, Integer mes, Integer anio) {
        if (listaId != null) listaService.leer(usuarioId, listaId);
        LocalDate hoy = CalendarioFinanciero.hoy();
        int mesConsulta = (mes != null && mes >= 1 && mes <= 12) ? mes : hoy.getMonthValue();
        int anioConsulta = (anio != null && anio >= 2000 && anio <= 2100) ? anio : hoy.getYear();

        List<Presupuesto> presupuestos;
        if (listaId != null) {
            presupuestos = presupuestoRepository.findByUsuarioIdAndFiltroListaAndMesAndAnio(
                    usuarioId, listaId, mesConsulta, anioConsulta
            );
        } else {
            presupuestos = presupuestoRepository.findByUsuarioIdAndMesAndAnio(
                    usuarioId, mesConsulta, anioConsulta
            );
        }

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

    @Transactional(readOnly = true)
    public PresupuestoDetalleResponse obtenerDetalle(Long usuarioId, Long id) {
        Presupuesto presupuesto = presupuestoRepository.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Presupuesto no encontrado o no autorizado"));

        PresupuestoResponse response = calcularMetricasPresupuesto(presupuesto, usuarioId);

        LocalDate inicio = LocalDate.of(presupuesto.getAnio(), presupuesto.getMes(), 1);
        LocalDate fin = inicio.withDayOfMonth(inicio.lengthOfMonth());
        Long listaId = presupuesto.getLista() != null ? presupuesto.getLista().getId() : null;

        List<TransaccionResponse> movimientos = transaccionRepository.findTransaccionesPresupuesto(
                usuarioId, presupuesto.getCategoria().getId(), listaId, presupuesto.getMoneda(), inicio, fin
        ).stream().map(TransaccionResponse::fromEntity).toList();

        return new PresupuestoDetalleResponse(response, movimientos);
    }

    @Transactional
    public PresupuestoDisponibleResponse obtenerDisponibleCategoria(
            Long usuarioId, Long categoriaId, Long listaId, LocalDate fecha, String moneda
    ) {
        if (listaId != null) listaService.leer(usuarioId, listaId);
        else {
            var personal = listaService.personal(usuarioId);
            if (personal != null) listaId = personal.getId();
        }
        Categoria categoria = categoriaRepository.findAccessibleById(categoriaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada o no accesible"));

        if (categoria.getTipo() != TipoTransaccion.GASTO) {
            return PresupuestoDisponibleResponse.sinPresupuesto(
                    categoria.getId(), categoria.getNombre(), categoria.getIcono(), moneda, listaId, null
            );
        }

        LocalDate fechaConsulta = (fecha != null) ? fecha : CalendarioFinanciero.hoy();
        int mes = fechaConsulta.getMonthValue();
        int anio = fechaConsulta.getYear();

        List<Presupuesto> candidatos = presupuestoRepository.findCandidatosParaDisponible(
                usuarioId, categoriaId, listaId, mes, anio
        );

        if (candidatos.isEmpty() && listaId != null) {
            // Compatibilidad: solo presupuestos globales legados realmente sin lista
            candidatos = presupuestoRepository.findCandidatosParaDisponible(
                    usuarioId, categoriaId, null, mes, anio
            );
        }

        if (candidatos.isEmpty()) {
            return PresupuestoDisponibleResponse.sinPresupuesto(
                    categoria.getId(), categoria.getNombre(), categoria.getIcono(), moneda, listaId, null
            );
        }

        Presupuesto presupuesto = candidatos.stream()
                .filter(p -> moneda == null || p.getMoneda().equalsIgnoreCase(moneda))
                .findFirst().orElse(null);
        if (presupuesto == null) return PresupuestoDisponibleResponse.sinPresupuesto(
                categoria.getId(), categoria.getNombre(), categoria.getIcono(), moneda, listaId, null);

        PresupuestoResponse metricas = calcularMetricasPresupuesto(presupuesto, usuarioId);

        return new PresupuestoDisponibleResponse(
                categoria.getId(),
                categoria.getNombre(),
                categoria.getIcono(),
                metricas.moneda(),
                metricas.montoLimite(),
                metricas.montoGastado(),
                metricas.montoDisponible(),
                metricas.porcentajeConsumido(),
                metricas.porcentajeAlerta(),
                metricas.estado(),
                true,
                metricas.listaId(),
                metricas.listaNombre()
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
        Long listaId = p.getLista() != null ? p.getLista().getId() : null;

        BigDecimal montoGastado = transaccionRepository.sumGastosPorUsuarioYCategoriaYListaYPeriodo(
                usuarioId, p.getCategoria().getId(), listaId, p.getMoneda(), inicioPeriodo, finPeriodo
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

        int umbralAlerta = p.getPorcentajeAlerta() != null ? p.getPorcentajeAlerta() : 80;

        String estado = "NORMAL";
        if (porcentajeConsumido.compareTo(BigDecimal.valueOf(100)) >= 0) {
            estado = "EXCEDIDO";
        } else if (porcentajeConsumido.compareTo(BigDecimal.valueOf(umbralAlerta)) >= 0) {
            estado = "ALERTA";
        }

        return PresupuestoResponse.of(p, montoGastado, montoDisponible, porcentajeConsumido, estado);
    }

    private String normalizarMoneda(String moneda) {
        return moneda == null || moneda.isBlank() ? "MXN" : moneda.trim().toUpperCase();
    }
}
