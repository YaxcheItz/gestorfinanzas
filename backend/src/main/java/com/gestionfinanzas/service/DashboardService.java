package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.response.DashboardResumenResponse;
import com.gestionfinanzas.dto.response.TransaccionResponse;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final CuentaRepository cuentaRepository;
    private final TransaccionRepository transaccionRepository;

    @Transactional(readOnly = true)
    public DashboardResumenResponse obtenerResumen(Long usuarioId, Integer mes, Integer anio) {
        LocalDate hoy = LocalDate.now();
        int mesConsulta = (mes != null && mes >= 1 && mes <= 12) ? mes : hoy.getMonthValue();
        int anioConsulta = (anio != null && anio >= 2000 && anio <= 2100) ? anio : hoy.getYear();

        LocalDate inicioPeriodo = LocalDate.of(anioConsulta, mesConsulta, 1);
        LocalDate finPeriodo = inicioPeriodo.withDayOfMonth(inicioPeriodo.lengthOfMonth());

        List<Cuenta> cuentasActivas = cuentaRepository.findByUsuarioIdAndActivoTrue(usuarioId);
        BigDecimal balanceTotal = cuentasActivas.stream()
                .map(Cuenta::getSaldoActual)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal ingresosMes = transaccionRepository.sumMontoPorUsuarioYTipoYPeriodo(
                usuarioId, TipoTransaccion.INGRESO, inicioPeriodo, finPeriodo
        );
        if (ingresosMes == null) {
            ingresosMes = BigDecimal.ZERO;
        }

        BigDecimal gastosMes = transaccionRepository.sumMontoPorUsuarioYTipoYPeriodo(
                usuarioId, TipoTransaccion.GASTO, inicioPeriodo, finPeriodo
        );
        if (gastosMes == null) {
            gastosMes = BigDecimal.ZERO;
        }

        BigDecimal balanceMes = ingresosMes.subtract(gastosMes);

        BigDecimal tasaAhorro = BigDecimal.ZERO;
        if (ingresosMes.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal ahorroPositivo = balanceMes.max(BigDecimal.ZERO);
            tasaAhorro = ahorroPositivo.multiply(BigDecimal.valueOf(100))
                    .divide(ingresosMes, 2, RoundingMode.HALF_UP);
        }

        List<TransaccionResponse> ultimosMovimientos = transaccionRepository
                .findTop10ByUsuarioIdOrderByFechaDescIdDesc(usuarioId)
                .stream()
                .map(TransaccionResponse::fromEntity)
                .toList();

        return new DashboardResumenResponse(
                balanceTotal,
                ingresosMes,
                gastosMes,
                balanceMes,
                tasaAhorro,
                cuentasActivas.size(),
                mesConsulta,
                anioConsulta,
                ultimosMovimientos
        );
    }
}
