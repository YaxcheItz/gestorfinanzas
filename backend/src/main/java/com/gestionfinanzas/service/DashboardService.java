package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.response.DashboardResumenResponse;
import com.gestionfinanzas.dto.response.DashboardAnaliticaResponse;
import com.gestionfinanzas.dto.response.DashboardGastoCategoriaResponse;
import com.gestionfinanzas.dto.response.DashboardMesResponse;
import com.gestionfinanzas.dto.response.DashboardMesTipoTotal;
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
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    @Transactional(readOnly = true)
    public DashboardAnaliticaResponse obtenerAnalitica(Long usuarioId) {
        YearMonth mesActual = YearMonth.now();
        LocalDate inicioMes = mesActual.atDay(1);
        LocalDate finMes = mesActual.atEndOfMonth();
        List<DashboardGastoCategoriaResponse> gastosPorCategoria =
                transaccionRepository.findGastosPorCategoria(
                        usuarioId, TipoTransaccion.GASTO, inicioMes, finMes
                );

        YearMonth primerMes = mesActual.minusMonths(5);
        LocalDate inicioPeriodo = primerMes.atDay(1);
        List<DashboardMesTipoTotal> totalesMensuales =
                transaccionRepository.sumMontosPorUsuarioYTipoAgrupadosPorMes(
                        usuarioId,
                        List.of(TipoTransaccion.INGRESO, TipoTransaccion.GASTO),
                        inicioPeriodo,
                        finMes
                );

        Map<YearMonth, BigDecimal[]> montosPorMes = new HashMap<>();
        for (int i = 0; i < 6; i++) {
            montosPorMes.put(primerMes.plusMonths(i), new BigDecimal[] { BigDecimal.ZERO, BigDecimal.ZERO });
        }

        for (DashboardMesTipoTotal total : totalesMensuales) {
            BigDecimal[] montos = montosPorMes.get(YearMonth.of(total.anio(), total.mes()));
            if (montos != null) {
                int indice = total.tipo() == TipoTransaccion.INGRESO ? 0 : 1;
                montos[indice] = total.monto();
            }
        }

        List<DashboardMesResponse> ultimosSeisMeses = new ArrayList<>(6);
        for (int i = 0; i < 6; i++) {
            YearMonth mes = primerMes.plusMonths(i);
            BigDecimal[] montos = montosPorMes.get(mes);
            ultimosSeisMeses.add(new DashboardMesResponse(mes.getYear(), mes.getMonthValue(), montos[0], montos[1]));
        }

        return new DashboardAnaliticaResponse(gastosPorCategoria, ultimosSeisMeses);
    }
}
