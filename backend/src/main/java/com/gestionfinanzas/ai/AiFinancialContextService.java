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
import com.gestionfinanzas.service.ListaService;
import com.gestionfinanzas.dto.response.ListaResponse;
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
    private final ListaService listaService;

    public List<ListaResponse> listarListas(Long userId) {
        return listaService.listar(userId);
    }

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
        return reporteLocal(userId,modo,desde,hasta,moneda,null,null,null,null);
    }

    @Transactional(readOnly = true)
    public AiActionService.AiActionResult reporteLocal(Long userId, String modo, LocalDate desde, LocalDate hasta,
            String moneda, Long cuentaId, Long categoriaId, String cuentaNombre, String categoriaNombre) {
        return reporteLocal(userId,modo,desde,hasta,moneda,cuentaId,categoriaId,cuentaNombre,categoriaNombre,null,null);
    }

    @Transactional(readOnly = true)
    public AiActionService.AiActionResult reporteLocal(Long userId, String modo, LocalDate desde, LocalDate hasta,
            String moneda, Long cuentaId, Long categoriaId, String cuentaNombre, String categoriaNombre,
            Long listaId, String listaNombre) {
        if(listaId!=null) listaService.leer(userId,listaId);
        if ("COMPARACION_MENSUAL".equals(modo)) {
            return comparacionMensual(userId, desde, hasta, moneda, cuentaId, categoriaId, cuentaNombre, categoriaNombre,listaId,listaNombre);
        }
        if ("SALDO".equals(modo)) {
            String texto=cuentaRepository.findByUsuarioIdAndActivoTrue(userId).stream()
                .filter(c -> (moneda==null || moneda.equals(c.getMoneda())) && (cuentaId==null || cuentaId.equals(c.getId())))
                .map(c -> c.getNombre()+": "+c.getSaldoActual().toPlainString()+" "+c.getMoneda())
                .collect(java.util.stream.Collectors.joining("\n"));
            return new AiActionService.AiActionResult(texto.isBlank()?"No hay cuentas activas para esa moneda.":"Saldos actuales (no dependen del periodo):\n"+texto,null);
        }
        String periodo=desde+" al "+hasta;
        if ("CATEGORIAS".equals(modo)) {
            var consultaCategorias=listaId==null
                    ? transaccionRepository.findGastosPorCategoriaFiltrado(userId,desde,hasta,cuentaId,categoriaId)
                    : transaccionRepository.findGastosPorCategoriaFiltradoEnLista(userId,listaId,desde,hasta,cuentaId,categoriaId);
            var categorias=consultaCategorias.stream()
                .filter(c -> moneda==null || moneda.equals(c.moneda())).toList();
            String texto=categorias.stream().map(c -> c.categoriaNombre()+": "+c.monto().toPlainString()+" "+c.moneda()).collect(java.util.stream.Collectors.joining("\n"));
            var monedas=categorias.stream().map(AiCategoriaAgregado::moneda).distinct().toList();
            var top=categorias.stream().limit(8).toList();
            var grafico=monedas.size()==1 ? new AiActionService.AiReportWidget("Gastos por categor\u00eda: "+periodo,
                top.stream().map(AiCategoriaAgregado::categoriaNombre).toList(),top.stream().map(c -> c.monto().doubleValue()).toList(),monedas.get(0)):null;
            var evidence=categorias.stream().map(c -> new AiEvidence(c.categoriaNombre(),desde,hasta,c.moneda(),
                    TipoTransaccion.GASTO,c.operaciones(),c.monto(),cuentaId,c.categoriaId(),cuentaNombre,c.categoriaNombre(),
                    c.categoriaId()==null,listaId,listaNombre,listaId==null?null:userId)).toList();
            return new AiActionService.AiActionResult("Gastos por categor\u00eda del "+periodo+alcance(cuentaNombre,categoriaNombre,listaNombre)+"\n"+(texto.isBlank()?"No hay gastos en ese periodo.":texto),null,List.of(),grafico,List.of(),null,evidence);
        }
        var consultaTotales=listaId==null
                ? transaccionRepository.findTotalesMensualesPorMonedaFiltrado(userId,desde,hasta,cuentaId,categoriaId)
                : transaccionRepository.findTotalesMensualesPorMonedaFiltradoEnLista(userId,listaId,desde,hasta,cuentaId,categoriaId);
        var consultaConteos=listaId==null
                ? transaccionRepository.findConteosPorMonedaYTipoFiltrado(userId,desde,hasta,cuentaId,categoriaId)
                : transaccionRepository.findConteosPorMonedaYTipoEnLista(userId,listaId,desde,hasta,cuentaId,categoriaId);
        var totales=consultaTotales.stream()
            .filter(t -> moneda==null||moneda.equals(t.moneda())).toList();
        var conteos=consultaConteos.stream()
                .filter(t->moneda==null||moneda.equals(t.moneda())).toList();
        String texto=totales.stream().map(t -> t.moneda()+": ingresos "+t.ingresos().toPlainString()+", gastos "+t.gastos().toPlainString()+", balance del periodo "+t.ingresos().subtract(t.gastos()).toPlainString()).collect(java.util.stream.Collectors.joining("\n"));
        AiActionService.AiReportWidget grafico=null;
        if(totales.size()==1){var t=totales.get(0);grafico=new AiActionService.AiReportWidget("Resumen: "+periodo,List.of("Ingresos","Gastos"),List.of(t.ingresos().doubleValue(),t.gastos().doubleValue()),t.moneda());}
        var evidence=new java.util.ArrayList<AiEvidence>();
        for(var total:totales)for(var tipo:List.of(TipoTransaccion.INGRESO,TipoTransaccion.GASTO)) {
            long operaciones=conteos.stream().filter(c->total.moneda().equals(c.moneda())&&tipo==c.tipo())
                    .mapToLong(com.gestionfinanzas.dto.response.MovimientoConteo::operaciones).sum();
            evidence.add(new AiEvidence(tipo==TipoTransaccion.INGRESO?"Ingresos":"Gastos",desde,hasta,total.moneda(),
                    tipo,operaciones,tipo==TipoTransaccion.INGRESO?total.ingresos():total.gastos(),
                    cuentaId,categoriaId,cuentaNombre,categoriaNombre,false,listaId,listaNombre,listaId==null?null:userId));
        }
        return new AiActionService.AiActionResult("Resumen del "+periodo+alcance(cuentaNombre,categoriaNombre,listaNombre)+"\n"+(texto.isBlank()?"No hay ingresos ni gastos registrados en ese periodo.":texto),null,List.of(),grafico,List.of(),null,evidence);
    }

    private static String alcance(String cuentaNombre,String categoriaNombre,String listaNombre) {
        StringBuilder alcance=new StringBuilder();
        if(cuentaNombre!=null)alcance.append(" · Cuenta: ").append(cuentaNombre);
        if(categoriaNombre!=null)alcance.append(" · Categoría: ").append(categoriaNombre);
        if(listaNombre!=null)alcance.append(" · Lista: ").append(listaNombre).append(" (movimientos propios)");
        return alcance.toString();
    }

    private AiActionService.AiActionResult comparacionMensual(Long userId, LocalDate desde, LocalDate hasta, String moneda,
            Long cuentaId, Long categoriaId, String cuentaNombre, String categoriaNombre,Long listaId,String listaNombre) {
        if (desde == null || hasta == null || desde.getDayOfMonth() != 1
                || hasta.isBefore(desde) || !YearMonth.from(desde).equals(YearMonth.from(hasta))) {
            throw new IllegalArgumentException("La comparación necesita un tramo válido del mismo mes.");
        }
        YearMonth mesAnterior = YearMonth.from(desde).minusMonths(1);
        LocalDate anteriorDesde = mesAnterior.atDay(1);
        LocalDate anteriorHasta = mesAnterior.atDay(Math.min(hasta.getDayOfMonth(), mesAnterior.lengthOfMonth()));
        var actuales = listaId==null?transaccionRepository.findTotalesMensualesPorMonedaFiltrado(userId, desde, hasta, cuentaId, categoriaId)
                :transaccionRepository.findTotalesMensualesPorMonedaFiltradoEnLista(userId,listaId,desde,hasta,cuentaId,categoriaId);
        var anteriores = listaId==null?transaccionRepository.findTotalesMensualesPorMonedaFiltrado(userId, anteriorDesde, anteriorHasta, cuentaId, categoriaId)
                :transaccionRepository.findTotalesMensualesPorMonedaFiltradoEnLista(userId,listaId,anteriorDesde,anteriorHasta,cuentaId,categoriaId);
        var conteosActuales = listaId==null?transaccionRepository.findConteosPorMonedaYTipoFiltrado(userId, desde, hasta, cuentaId, categoriaId)
                :transaccionRepository.findConteosPorMonedaYTipoEnLista(userId,listaId,desde,hasta,cuentaId,categoriaId);
        var conteosAnteriores = listaId==null?transaccionRepository.findConteosPorMonedaYTipoFiltrado(userId, anteriorDesde, anteriorHasta, cuentaId, categoriaId)
                :transaccionRepository.findConteosPorMonedaYTipoEnLista(userId,listaId,anteriorDesde,anteriorHasta,cuentaId,categoriaId);
        var evidence = new java.util.ArrayList<AiEvidence>();
        var monedas = java.util.stream.Stream.concat(actuales.stream(), anteriores.stream())
                .map(DashboardMonedaTotales::moneda).filter(m -> moneda == null || moneda.equals(m))
                .collect(java.util.stream.Collectors.toCollection(java.util.TreeSet::new));
        var respuesta = new StringBuilder("Comparación mensual de movimientos propios registrados\n")
                .append("Actual: ").append(desde).append(" al ").append(hasta)
                .append("\nAnterior: ").append(anteriorDesde).append(" al ").append(anteriorHasta)
                .append("\nSe compara hasta el mismo día del mes, limitado al último día si el mes anterior es más corto.");
        for (String divisa : monedas) {
            var cero = new DashboardMonedaTotales(divisa, BigDecimal.ZERO, BigDecimal.ZERO);
            var actual = actuales.stream().filter(t -> divisa.equals(t.moneda())).findFirst().orElse(cero);
            var anterior = anteriores.stream().filter(t -> divisa.equals(t.moneda())).findFirst().orElse(cero);
            for (var tipo : List.of(TipoTransaccion.INGRESO, TipoTransaccion.GASTO)) {
                String nombre = tipo == TipoTransaccion.INGRESO ? "Ingresos" : "Gastos";
                long cantidadActual = conteosActuales.stream().filter(t -> divisa.equals(t.moneda()) && t.tipo() == tipo).mapToLong(com.gestionfinanzas.dto.response.MovimientoConteo::operaciones).sum();
                long cantidadAnterior = conteosAnteriores.stream().filter(t -> divisa.equals(t.moneda()) && t.tipo() == tipo).mapToLong(com.gestionfinanzas.dto.response.MovimientoConteo::operaciones).sum();
                evidence.add(new AiEvidence(nombre + " actual", desde, hasta, divisa, tipo, cantidadActual, tipo == TipoTransaccion.INGRESO ? actual.ingresos() : actual.gastos(),cuentaId,categoriaId,cuentaNombre,categoriaNombre,false,listaId,listaNombre,listaId==null?null:userId));
                evidence.add(new AiEvidence(nombre + " anterior", anteriorDesde, anteriorHasta, divisa, tipo, cantidadAnterior, tipo == TipoTransaccion.INGRESO ? anterior.ingresos() : anterior.gastos(),cuentaId,categoriaId,cuentaNombre,categoriaNombre,false,listaId,listaNombre,listaId==null?null:userId));
            }
            respuesta.append("\n").append(divisa).append(":\nIngresos: actual ")
                    .append(actual.ingresos().toPlainString()).append(", anterior ").append(anterior.ingresos().toPlainString())
                    .append(", diferencia ").append(actual.ingresos().subtract(anterior.ingresos()).toPlainString())
                    .append("\nGastos: actual ").append(actual.gastos().toPlainString())
                    .append(", anterior ").append(anterior.gastos().toPlainString())
                    .append(", diferencia ").append(actual.gastos().subtract(anterior.gastos()).toPlainString());
        }
        if (monedas.isEmpty()) respuesta.append("\nNo hay ingresos ni gastos registrados en esos periodos para la moneda solicitada.");
        respuesta.append("\nFuente: ingresos y gastos del usuario autenticado").append(alcance(cuentaNombre,categoriaNombre,listaNombre))
                .append("; transferencias excluidas. No se suman monedas ni se estiman movimientos faltantes.");
        return new AiActionService.AiActionResult(respuesta.toString(), null, List.of(), null, List.of(), null, List.copyOf(evidence));
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
