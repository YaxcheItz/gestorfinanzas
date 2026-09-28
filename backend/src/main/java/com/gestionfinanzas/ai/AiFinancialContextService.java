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
        YearMonth currentMonth = YearMonth.now();
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
                LocalDate.now(),
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
