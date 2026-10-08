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
import com.gestionfinanzas.model.entity.AportacionPareja;
import com.gestionfinanzas.model.entity.GastoPareja;
import com.gestionfinanzas.model.entity.PagoPareja;
import com.gestionfinanzas.model.entity.Pareja;
import com.gestionfinanzas.model.entity.Presupuesto;
import com.gestionfinanzas.model.entity.RepartoGasto;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.repository.AportacionParejaRepository;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.GastoParejaRepository;
import com.gestionfinanzas.repository.PagoParejaRepository;
import com.gestionfinanzas.repository.ParejaRepository;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
import com.gestionfinanzas.repository.PresupuestoRepository;
import com.gestionfinanzas.repository.RepartoGastoRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.specification.TransaccionSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
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
    private final ParejaRepository parejaRepository;
    private final AportacionParejaRepository aportacionRepository;
    private final GastoParejaRepository gastoRepository;
    private final RepartoGastoRepository repartoRepository;
    private final PagoParejaRepository pagoRepository;

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
        List<com.gestionfinanzas.model.entity.Transaccion> entidadesTransacciones = transaccionRepository.findAll(
                        TransaccionSpecification.soloUsuario(usuarioId),
                        Sort.by(Sort.Direction.ASC, "fecha", "id")
                );
        List<TransaccionResponse> transacciones = entidadesTransacciones.stream()
                .map(TransaccionResponse::fromEntity)
                .toList();
        List<RespaldoFinancieroResponse.CashbackRespaldo> relacionesCashback = entidadesTransacciones.stream()
                .filter(transaccion -> transaccion.getCashbackOrigen() != null)
                .map(transaccion -> new RespaldoFinancieroResponse.CashbackRespaldo(
                        transaccion.getId(), transaccion.getCashbackOrigen().getId()
                ))
                .toList();

        return new RespaldoFinancieroResponse(
                3,
                Instant.now(),
                perfilService.obtener(usuarioId),
                cuentas,
                categorias,
                presupuestos,
                recurrencias,
                auditoriaService.listarParaRespaldo(usuarioId),
                libroDiarioService.listarParaRespaldo(usuarioId),
                transacciones,
                relacionesCashback,
                mapearParejas(usuarioId)
        );
    }

    /**
     * Los gastos compartidos se exportan en su totalidad, no solo la parte de quien
     * descarga el respaldo: el fondo común no tiene dueño y saldría descuadrado si se
     * filtrara por usuario.
     */
    private List<RespaldoFinancieroResponse.ParejaRespaldo> mapearParejas(Long usuarioId) {
        List<Pareja> parejas = parejaRepository.findTodasDeUsuario(usuarioId);
        if (parejas.isEmpty()) {
            return List.of();
        }

        List<RespaldoFinancieroResponse.ParejaRespaldo> resultado = new ArrayList<>();
        for (Pareja pareja : parejas) {
            Usuario yo = pareja.getUsuarioA().getId().equals(usuarioId) ? pareja.getUsuarioA() : pareja.getUsuarioB();
            Usuario otro = yo == pareja.getUsuarioA() ? pareja.getUsuarioB() : pareja.getUsuarioA();

            List<RespaldoFinancieroResponse.AporteRespaldo> aportes = aportacionRepository
                    .findByParejaIdOrderByFechaDescIdDesc(pareja.getId()).stream()
                    .map(aporte -> new RespaldoFinancieroResponse.AporteRespaldo(
                            aporte.getId(), miembro(aporte.getUsuario(), usuarioId), aporte.getMonto(),
                            aporte.getMoneda(), aporte.getFecha(), aporte.getNotas(), aporte.getFechaCreacion()
                    ))
                    .toList();

            List<RespaldoFinancieroResponse.GastoRespaldo> gastos = new ArrayList<>();
            for (GastoPareja gasto : gastoRepository.findByParejaIdOrderByFechaDescIdDesc(pareja.getId())) {
                List<RepartoGasto> repartos = repartoRepository.findByGastoIdOrderByIdAsc(gasto.getId());
                gastos.add(new RespaldoFinancieroResponse.GastoRespaldo(
                        gasto.getId(), miembro(gasto.getPagadoPor(), usuarioId), gasto.getMonto(),
                        gasto.getMoneda(), gasto.getFecha(), gasto.getDescripcion(),
                        ParejaService.tipoRepartoDe(repartos) == null
                                ? null : ParejaService.tipoRepartoDe(repartos).name(),
                        repartos.stream()
                                .map(parte -> new RespaldoFinancieroResponse.ParteRespaldo(
                                        miembro(parte.getUsuario(), usuarioId), parte.getMonto(), parte.getPorcentaje()
                                ))
                                .toList(),
                        gasto.getFechaCreacion()
                ));
            }

            List<RespaldoFinancieroResponse.PagoRespaldo> pagos = pagoRepository
                    .findByParejaIdOrderByFechaDescIdDesc(pareja.getId()).stream()
                    .map(pago -> new RespaldoFinancieroResponse.PagoRespaldo(
                            pago.getId(), miembro(pago.getPagador(), usuarioId), miembro(pago.getBeneficiario(), usuarioId),
                            pago.getMonto(), pago.getMoneda(), pago.getFecha(), pago.getNotas(), pago.getFechaCreacion(),
                            pago.getRegistradoPor() == null ? null : miembro(pago.getRegistradoPor(),usuarioId)
                    ))
                    .toList();

            resultado.add(new RespaldoFinancieroResponse.ParejaRespaldo(
                    pareja.getId(), pareja.isActiva(), pareja.getMoneda(), pareja.getFechaCreacion(),
                    otro.getNombre(), ParejaService.correoCompartido(pareja,otro.getId()), aportes, gastos, pagos
            ));
        }
        return List.copyOf(resultado);
    }

    private RespaldoFinancieroResponse.MiembroRespaldo miembro(Usuario usuario, Long propietarioId) {
        return new RespaldoFinancieroResponse.MiembroRespaldo(
                usuario.getNombre(), usuario.getId().equals(propietarioId)
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
