package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.response.DashboardResumenResponse;
import com.gestionfinanzas.dto.response.DashboardAnaliticaResponse;
import com.gestionfinanzas.dto.response.DashboardGastoCategoriaResponse;
import com.gestionfinanzas.dto.response.DashboardMesResponse;
import com.gestionfinanzas.dto.response.DashboardMesTipoTotal;
import com.gestionfinanzas.dto.response.DashboardMonedaResumenResponse;
import com.gestionfinanzas.dto.response.DashboardMonedaTotales;
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
import java.util.Set;
import java.util.TreeSet;

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
        Map<String, BigDecimal> balancesPorMoneda = new HashMap<>();
        Map<String, Integer> cuentasPorMoneda = new HashMap<>();
        for (Cuenta cuenta : cuentasActivas) {
            balancesPorMoneda.merge(cuenta.getMoneda(), cuenta.getSaldoActual(), BigDecimal::add);
            cuentasPorMoneda.merge(cuenta.getMoneda(), 1, Integer::sum);
        }
        List<DashboardMonedaTotales> totalesMensuales =
                transaccionRepository.findTotalesMensualesPorMoneda(usuarioId, inicioPeriodo, finPeriodo);
        Map<String, DashboardMonedaTotales> totalesPorMoneda = new HashMap<>();
        totalesMensuales.forEach(total -> totalesPorMoneda.put(total.moneda(), total));
        Set<String> monedas = new TreeSet<>(balancesPorMoneda.keySet());
        monedas.addAll(totalesPorMoneda.keySet());
        List<DashboardMonedaResumenResponse> resumenPorMoneda = monedas.stream()
                .map(moneda -> {
                    BigDecimal balance = balancesPorMoneda.getOrDefault(moneda, BigDecimal.ZERO);
                    DashboardMonedaTotales totales = totalesPorMoneda.get(moneda);
                    BigDecimal ingresos = totales != null ? totales.ingresos() : BigDecimal.ZERO;
                    BigDecimal gastos = totales != null ? totales.gastos() : BigDecimal.ZERO;
                    BigDecimal balanceMes = ingresos.subtract(gastos);
                    BigDecimal tasaAhorro = ingresos.compareTo(BigDecimal.ZERO) > 0
                            ? balanceMes.max(BigDecimal.ZERO).multiply(BigDecimal.valueOf(100))
                                    .divide(ingresos, 2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;
                    return new DashboardMonedaResumenResponse(
                            moneda, balance, ingresos, gastos, balanceMes, tasaAhorro,
                            cuentasPorMoneda.getOrDefault(moneda, 0)
                    );
                })
                .toList();
        DashboardMonedaResumenResponse resumenMxn = resumenPorMoneda.stream()
                .filter(resumen -> "MXN".equals(resumen.moneda()))
                .findFirst()
                .orElse(new DashboardMonedaResumenResponse(
                        "MXN", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                        BigDecimal.ZERO, BigDecimal.ZERO, 0
                ));

        List<TransaccionResponse> ultimosMovimientos = transaccionRepository
                .findTop10ByUsuarioIdOrderByFechaDescIdDesc(usuarioId)
                .stream()
                .map(TransaccionResponse::fromEntity)
                .toList();

        return new DashboardResumenResponse(
                resumenMxn.balanceTotal(),
                resumenMxn.ingresosMes(),
                resumenMxn.gastosMes(),
                resumenMxn.balanceMes(),
                resumenMxn.tasaAhorro(),
                cuentasActivas.size(),
                mesConsulta,
                anioConsulta,
                ultimosMovimientos,
                resumenPorMoneda
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

        Map<String, Map<YearMonth, BigDecimal[]>> montosPorMonedaYMes = new HashMap<>();
        Set<String> monedas = new TreeSet<>();
        cuentaRepository.findByUsuarioIdAndActivoTrue(usuarioId)
                .forEach(cuenta -> monedas.add(cuenta.getMoneda()));
        totalesMensuales.forEach(total -> monedas.add(total.moneda()));
        for (String moneda : monedas) {
            Map<YearMonth, BigDecimal[]> montosPorMes = montosPorMonedaYMes.computeIfAbsent(
                    moneda, ignored -> new HashMap<>()
            );
            for (int i = 0; i < 6; i++) {
                YearMonth mes = primerMes.plusMonths(i);
                montosPorMes
                        .putIfAbsent(mes, new BigDecimal[] { BigDecimal.ZERO, BigDecimal.ZERO });
            }
        }

        for (DashboardMesTipoTotal total : totalesMensuales) {
            YearMonth mes = YearMonth.of(total.anio(), total.mes());
            BigDecimal[] montos = montosPorMonedaYMes
                    .computeIfAbsent(total.moneda(), ignored -> new HashMap<>())
                    .computeIfAbsent(mes, ignored -> new BigDecimal[] { BigDecimal.ZERO, BigDecimal.ZERO });
            if (montos != null) {
                int indice = total.tipo() == TipoTransaccion.INGRESO ? 0 : 1;
                montos[indice] = total.monto();
            }
        }

        List<DashboardMesResponse> ultimosSeisMeses = new ArrayList<>(montosPorMonedaYMes.size() * 6);
        for (String moneda : new TreeSet<>(montosPorMonedaYMes.keySet())) {
        for (int i = 0; i < 6; i++) {
            YearMonth mes = primerMes.plusMonths(i);
            BigDecimal[] montos = montosPorMonedaYMes.get(moneda).getOrDefault(
                    mes, new BigDecimal[] { BigDecimal.ZERO, BigDecimal.ZERO }
            );
            ultimosSeisMeses.add(new DashboardMesResponse(
                    mes.getYear(), mes.getMonthValue(), montos[0], montos[1], moneda
            ));
        }
        }

        return new DashboardAnaliticaResponse(gastosPorCategoria, ultimosSeisMeses);
    }
}
