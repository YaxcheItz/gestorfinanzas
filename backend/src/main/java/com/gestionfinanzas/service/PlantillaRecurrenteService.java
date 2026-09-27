package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.TransaccionRequest;
import com.gestionfinanzas.dto.response.PlantillaRecurrenteResponse;
import com.gestionfinanzas.model.entity.PlantillaRecurrente;
import com.gestionfinanzas.model.enums.FrecuenciaRecurrencia;
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
        plantilla.setActiva(activa);
        return PlantillaRecurrenteResponse.fromEntity(plantillaRepository.save(plantilla));
    }

    @Transactional
    public void eliminar(Long usuarioId, Long plantillaId) {
        plantillaRepository.delete(buscar(usuarioId, plantillaId));
    }

    @Transactional
    public void registrarSiguiente(Long usuarioId, Long plantillaId) {
        PlantillaRecurrente plantilla = buscar(usuarioId, plantillaId);
        if (!plantilla.isActiva()) {
            throw new IllegalArgumentException("La plantilla recurrente está pausada");
        }
        LocalDate fecha = plantilla.getSiguienteFecha();
        if (fecha.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("Este movimiento recurrente aún no vence");
        }

        transaccionService.crearTransaccion(usuarioId, new TransaccionRequest(
                plantilla.getCuenta().getId(),
                null,
                plantilla.getCategoria() != null ? plantilla.getCategoria().getId() : null,
                plantilla.getTipo(),
                plantilla.getMonto(),
                null,
                fecha,
                null,
                plantilla.getNotas(),
                null,
                null
        ));
        plantilla.setSiguienteFecha(siguienteFecha(fecha, plantilla.getFrecuencia()));
        plantillaRepository.save(plantilla);
    }

    private PlantillaRecurrente buscar(Long usuarioId, Long plantillaId) {
        return plantillaRepository.findByIdAndUsuarioId(plantillaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Plantilla recurrente no encontrada"));
    }

    private LocalDate siguienteFecha(LocalDate fecha, FrecuenciaRecurrencia frecuencia) {
        return switch (frecuencia) {
            case SEMANAL -> fecha.plusWeeks(1);
            case QUINCENAL -> fecha.plusWeeks(2);
            case MENSUAL -> {
                LocalDate siguienteMes = fecha.plusMonths(1);
                int dia = fecha.getDayOfMonth() == fecha.lengthOfMonth()
                        ? siguienteMes.lengthOfMonth()
                        : Math.min(fecha.getDayOfMonth(), siguienteMes.lengthOfMonth());
                yield siguienteMes.withDayOfMonth(dia);
            }
            case ANUAL -> fecha.plusYears(1);
        };
    }
}
