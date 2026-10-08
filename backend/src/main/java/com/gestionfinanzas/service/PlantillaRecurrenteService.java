package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.TransaccionRequest;
import com.gestionfinanzas.dto.response.PlantillaRecurrenteResponse;
import com.gestionfinanzas.model.entity.PlantillaRecurrente;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PlantillaRecurrenteService {

    private final PlantillaRecurrenteRepository plantillaRepository;
    private final TransaccionService transaccionService;

    @Transactional(readOnly = true)
    public List<PlantillaRecurrenteResponse> listar(Long usuarioId) {
        return plantillaRepository.findAllByUsuarioIdOrderBySiguienteFechaAsc(usuarioId).stream()
                .map(PlantillaRecurrenteResponse::fromEntity)
                .toList();
    }

    @Transactional
    public PlantillaRecurrenteResponse cambiarEstado(Long usuarioId, Long plantillaId, boolean activa) {
        PlantillaRecurrente plantilla = buscar(usuarioId, plantillaId);
        if (activa && plantilla.getCuotasTotales() != null
                && plantilla.getCuotasPagadas() >= plantilla.getCuotasTotales()) {
            throw new IllegalArgumentException("Esta compra MSI ya terminó");
        }
        plantilla.setActiva(activa);
        return PlantillaRecurrenteResponse.fromEntity(plantillaRepository.save(plantilla));
    }

    @Transactional
    public void eliminar(Long usuarioId, Long plantillaId) {
        PlantillaRecurrente plantilla = buscar(usuarioId, plantillaId);
        if (plantilla.getCuotasTotales() != null) {
            java.math.BigDecimal pendiente = pendiente(plantilla);
            Cuenta cuenta = plantilla.getCuenta();
            java.math.BigDecimal retenido = cuenta.getLimiteRetenido() == null
                    ? java.math.BigDecimal.ZERO : cuenta.getLimiteRetenido();
            if (retenido.compareTo(pendiente) < 0) {
                throw new IllegalArgumentException("La retención MSI no coincide con las cuotas pendientes; revisa la cuenta antes de cancelar");
            }
            cuenta.setLimiteRetenido(retenido.subtract(pendiente));
        }
        plantillaRepository.delete(plantilla);
    }

    @Transactional
    public void registrarSiguiente(Long usuarioId, Long plantillaId) {
        PlantillaRecurrente plantilla = buscar(usuarioId, plantillaId);
        if (!plantilla.isActiva()) {
            throw new IllegalArgumentException("La plantilla recurrente está pausada");
        }
        LocalDate fecha = plantilla.getSiguienteFecha();
        if (fecha.isAfter(CalendarioFinanciero.hoy())) {
            throw new IllegalArgumentException("Este movimiento recurrente aún no vence");
        }

        String descripcion = null;
        java.math.BigDecimal monto = plantilla.getMonto();
        if (plantilla.getCuotasTotales() != null) {
            if (plantilla.getCuotasPagadas() >= plantilla.getCuotasTotales()) {
                throw new IllegalArgumentException("Esta compra MSI ya terminó");
            }
            java.math.BigDecimal pendiente = pendiente(plantilla);
            if (plantilla.getCuotasPagadas() + 1 == plantilla.getCuotasTotales()) monto = pendiente;
            plantilla.setCuotasPagadas(plantilla.getCuotasPagadas() + 1);
            descripcion = "Cuota " + (plantilla.getCuotasPagadas() + 1) + "/" + (plantilla.getCuotasTotales() + 1);
            
            Cuenta cuenta = plantilla.getCuenta();
            java.math.BigDecimal retenido = cuenta.getLimiteRetenido() != null ? cuenta.getLimiteRetenido() : java.math.BigDecimal.ZERO;
            if (retenido.compareTo(monto) < 0) {
                throw new IllegalArgumentException("La retención MSI no coincide con el plan de pagos");
            }
            cuenta.setLimiteRetenido(retenido.subtract(monto));
            plantilla.setMontoPendiente(pendiente.subtract(monto));
            
            if (plantilla.getCuotasPagadas() >= plantilla.getCuotasTotales()) {
                plantilla.setActiva(false);
            }
        }

        transaccionService.crearCuotaRecurrente(usuarioId, new TransaccionRequest(
                plantilla.getCuenta().getId(),
                null,
                plantilla.getCategoria() != null ? plantilla.getCategoria().getId() : null,
                plantilla.getTipo(),
                monto,
                null,
                fecha,
                descripcion,
                plantilla.getNotas(),
                null,
                null,
                null
        ), plantilla.getCompraMsiId());
        if (plantilla.getFechaAncla() == null) plantilla.setFechaAncla(fecha);
        plantilla.setSiguienteFecha(CalendarioFinanciero.siguiente(fecha, plantilla.getFrecuencia(), plantilla.getFechaAncla()));
        plantillaRepository.save(plantilla);
    }

    private PlantillaRecurrente buscar(Long usuarioId, Long plantillaId) {
        return plantillaRepository.findByIdAndUsuarioId(plantillaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Plantilla recurrente no encontrada"));
    }

    private java.math.BigDecimal pendiente(PlantillaRecurrente plantilla) {
        return plantilla.getMontoPendiente() != null ? plantilla.getMontoPendiente()
                : plantilla.getMonto().multiply(java.math.BigDecimal.valueOf(
                        plantilla.getCuotasTotales() - plantilla.getCuotasPagadas()));
    }
}

