package com.gestionfinanzas.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestionfinanzas.dto.response.DashboardGastoCategoriaResponse;
import com.gestionfinanzas.dto.response.DashboardMesTipoTotal;
import com.gestionfinanzas.dto.response.DashboardMonedaTotales;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AiFinancialContextService {
    private static final int CATEGORY_LIMIT = 10;
    private static final int HISTORY_MONTHS = 6;

    private final CuentaRepository cuentaRepository;
    private final TransaccionRepository transaccionRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public String buildContext(Long userId) {
        YearMonth currentMonth = YearMonth.from(com.gestionfinanzas.service.CalendarioFinanciero.hoy());
        YearMonth firstMonth = currentMonth.minusMonths(HISTORY_MONTHS - 1);
        LocalDate monthStart = currentMonth.atDay(1);
        LocalDate monthEnd = currentMonth.atEndOfMonth();

        List<AccountSummary> accounts = cuentaRepository.findByUsuarioIdAndActivoTrue(userId).stream()
                .sorted(Comparator.comparing(Cuenta::getNombre, String.CASE_INSENSITIVE_ORDER))
                .map(account -> new AccountSummary(
                        account.getNombre(),
                        account.getTipo(),
                        account.getSaldoActual(),
                        account.getMoneda(),
                        account.getTipo() == TipoCuenta.CREDITO ? account.getLimiteCredito() : null
                ))
                .toList();

        List<DashboardMonedaTotales> currentMonthTotals =
                transaccionRepository.findTotalesMensualesPorMoneda(userId, monthStart, monthEnd);
        List<CategoryExpenseSummary> currentMonthExpensesByCategory =
                transaccionRepository.findGastosPorCategoria(
                                userId, TipoTransaccion.GASTO, monthStart, monthEnd
                        ).stream()
                        .limit(CATEGORY_LIMIT)
                        .map(expense -> new CategoryExpenseSummary(
                                expense.categoriaNombre(), expense.monto(), expense.moneda()
                        ))
                        .toList();
        List<DashboardMesTipoTotal> monthlyHistory =
                transaccionRepository.sumMontosPorUsuarioYTipoAgrupadosPorMes(
                        userId,
                        List.of(TipoTransaccion.INGRESO, TipoTransaccion.GASTO),
                        firstMonth.atDay(1),
                        monthEnd
                );

        FinancialContext context = new FinancialContext(
                com.gestionfinanzas.service.CalendarioFinanciero.hoy(),
                accounts,
                currentMonthTotals,
                currentMonthExpensesByCategory,
                monthlyHistory
        );
        try {
            return objectMapper.writeValueAsString(context);
        } catch (JsonProcessingException ex) {
            throw new AiProviderException("No fue posible preparar el resumen financiero para el asistente.");
        }
    }

    /** Totales agregados en SQL y siempre acotados al usuario autenticado. */
    @Transactional(readOnly = true)
    public AiActionService.AiActionResult reporteLocal(Long userId, String modo, LocalDate desde, LocalDate hasta, String moneda) {
        if ("SALDO".equals(modo)) {
            String texto=cuentaRepository.findByUsuarioIdAndActivoTrue(userId).stream()
                .filter(c -> moneda==null || moneda.equals(c.getMoneda()))
                .map(c -> c.getNombre()+": "+c.getSaldoActual().toPlainString()+" "+c.getMoneda())
                .collect(java.util.stream.Collectors.joining("\n"));
            return new AiActionService.AiActionResult(texto.isBlank()?"No hay cuentas activas para esa moneda.":"Saldos actuales (no dependen del periodo):\n"+texto,null);
        }
        String periodo=desde+" al "+hasta;
        if ("CATEGORIAS".equals(modo)) {
            var categorias=transaccionRepository.findGastosPorCategoria(userId,TipoTransaccion.GASTO,desde,hasta).stream()
                .filter(c -> moneda==null || moneda.equals(c.moneda())).toList();
            String texto=categorias.stream().map(c -> (c.categoriaNombre()==null?"Sin categor\u00eda":c.categoriaNombre())+": "+c.monto().toPlainString()+" "+c.moneda()).collect(java.util.stream.Collectors.joining("\n"));
            var monedas=categorias.stream().map(DashboardGastoCategoriaResponse::moneda).distinct().toList();
            var top=categorias.stream().limit(8).toList();
            var grafico=monedas.size()==1 ? new AiActionService.AiReportWidget("Gastos por categor\u00eda: "+periodo,
                top.stream().map(c -> c.categoriaNombre()==null?"Sin categor\u00eda":c.categoriaNombre()).toList(),top.stream().map(c -> c.monto().doubleValue()).toList(),monedas.get(0)):null;
            return new AiActionService.AiActionResult("Gastos por categor\u00eda del "+periodo+"\n"+(texto.isBlank()?"No hay gastos en ese periodo.":texto),null,List.of(),grafico);
        }
        var totales=transaccionRepository.findTotalesMensualesPorMoneda(userId,desde,hasta).stream()
            .filter(t -> moneda==null||moneda.equals(t.moneda())).toList();
        String texto=totales.stream().map(t -> t.moneda()+": ingresos "+t.ingresos().toPlainString()+", gastos "+t.gastos().toPlainString()+", balance del periodo "+t.ingresos().subtract(t.gastos()).toPlainString()).collect(java.util.stream.Collectors.joining("\n"));
        AiActionService.AiReportWidget grafico=null;
        if(totales.size()==1){var t=totales.get(0);grafico=new AiActionService.AiReportWidget("Resumen: "+periodo,List.of("Ingresos","Gastos"),List.of(t.ingresos().doubleValue(),t.gastos().doubleValue()),t.moneda());}
        return new AiActionService.AiActionResult("Resumen del "+periodo+"\n"+(texto.isBlank()?"No hay ingresos ni gastos registrados en ese periodo.":texto),null,List.of(),grafico);
    }

    private record AccountSummary(
            String name,
            TipoCuenta type,
            BigDecimal balance,
            String currency,
            BigDecimal creditLimit
    ) {}

    private record CategoryExpenseSummary(String category, BigDecimal amount, String currency) {}

    private record FinancialContext(
            LocalDate asOf,
            List<AccountSummary> activeAccounts,
            List<DashboardMonedaTotales> currentMonthTotalsByCurrency,
            List<CategoryExpenseSummary> currentMonthExpensesByCategory,
            List<DashboardMesTipoTotal> incomeAndExpenseHistory
    ) {}
}
