package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.TransaccionFiltroRequest;
import com.gestionfinanzas.dto.response.AuditoriaTransaccionResponse;
import com.gestionfinanzas.dto.response.AsientoContableResponse;
import com.gestionfinanzas.dto.response.CategoriaResponse;
import com.gestionfinanzas.dto.response.CuentaResponse;
import com.gestionfinanzas.dto.response.AsientoContableResponse;
import com.gestionfinanzas.dto.response.PerfilResponse;
import com.gestionfinanzas.dto.response.PlantillaRecurrenteResponse;
import com.gestionfinanzas.dto.response.RespaldoFinancieroResponse;
import com.gestionfinanzas.dto.response.TransaccionResponse;
import com.gestionfinanzas.model.entity.Presupuesto;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
import com.gestionfinanzas.repository.PresupuestoRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.specification.TransaccionSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RespaldoFinancieroService {

    private final PerfilService perfilService;
    private final CuentaRepository cuentaRepository;
    private final CategoriaRepository categoriaRepository;
    private final PresupuestoRepository presupuestoRepository;
    private final PlantillaRecurrenteRepository plantillaRepository;
    private final TransaccionRepository transaccionRepository;
    private final AuditoriaTransaccionService auditoriaService;
    private final LibroDiarioService libroDiarioService;

    @Transactional(readOnly = true)
    public RespaldoFinancieroResponse generar(Long usuarioId) {
        List<CuentaResponse> cuentas = cuentaRepository
                .findByUsuarioIdOrderByActivoDescNombreAsc(usuarioId).stream()
                .map(CuentaResponse::fromEntity)
                .toList();
        List<CategoriaResponse> categorias = categoriaRepository
                .findByUsuarioIdOrderByActivoDescNombreAsc(usuarioId).stream()
                .map(CategoriaResponse::fromEntity)
                .toList();
        List<RespaldoFinancieroResponse.PresupuestoRespaldo> presupuestos = presupuestoRepository
                .findAllByUsuarioIdOrderByAnioDescMesDescIdAsc(usuarioId).stream()
                .map(RespaldoFinancieroService::mapearPresupuesto)
                .toList();
        List<PlantillaRecurrenteResponse> recurrencias = plantillaRepository
                .findAllByUsuarioIdOrderBySiguienteFechaAsc(usuarioId).stream()
                .map(PlantillaRecurrenteResponse::fromEntity)
                .toList();
        List<TransaccionResponse> transacciones = transaccionRepository.findAll(
                        TransaccionSpecification.soloUsuario(usuarioId),
                        Sort.by(Sort.Direction.ASC, "fecha", "id")
                ).stream()
                .map(TransaccionResponse::fromEntity)
                .toList();

        return new RespaldoFinancieroResponse(
                1,
                Instant.now(),
                perfilService.obtener(usuarioId),
                cuentas,
                categorias,
                presupuestos,
                recurrencias,
                auditoriaService.listarParaRespaldo(usuarioId),
                libroDiarioService.listarParaRespaldo(usuarioId),
                transacciones
        );
    }

    private static RespaldoFinancieroResponse.PresupuestoRespaldo mapearPresupuesto(Presupuesto presupuesto) {
        return new RespaldoFinancieroResponse.PresupuestoRespaldo(
                presupuesto.getId(),
                presupuesto.getCategoria().getId(),
                presupuesto.getMontoLimite(),
                presupuesto.getMoneda(),
                presupuesto.getMes(),
                presupuesto.getAnio()
        );
    }
}
