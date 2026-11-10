package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.TransaccionFiltroRequest;
import com.gestionfinanzas.dto.response.TransaccionResponse;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.specification.TransaccionSpecification;
import java.math.BigDecimal;
import java.util.List;

/** Proyeccion de solo lectura: nunca crea transacciones ni reconstruye una fecha de compra. */
public final class ComprasMsiAnteriores {
    private ComprasMsiAnteriores() {}
    public static BigDecimal total(List<Transaccion> movimientos) {
        var cuotas=movimientos.stream().filter(t -> !t.isCompraMsiInformativa()).toList();
        if(cuotas.isEmpty()) return BigDecimal.ZERO;
        var plan=cuotas.getFirst().getPlantillaRecurrente();
        var pendiente=plan==null ? BigDecimal.ZERO : plan.getMontoPendiente()!=null ? plan.getMontoPendiente()
                : plan.getMonto().multiply(BigDecimal.valueOf(plan.getCuotasTotales()-plan.getCuotasPagadas()));
        return cuotas.stream().map(Transaccion::getMonto).reduce(pendiente,BigDecimal::add);
    }
    private static final java.util.Comparator<TransaccionResponse> ORDEN =
            java.util.Comparator.comparing(TransaccionResponse::fecha).reversed()
                    .thenComparing(TransaccionResponse::id, java.util.Comparator.reverseOrder());

    /** Ubica proyecciones entre los limites de las paginas contables, sin sumarlas a sus totales. */
    public static List<TransaccionResponse> enPagina(List<TransaccionResponse> compras,
            org.springframework.data.domain.Page<TransaccionResponse> pagina, TransaccionResponse siguiente) {
        if (pagina.isEmpty()) return pagina.getNumber() == 0 ? compras : List.of();
        var primero = pagina.getContent().getFirst();
        return compras.stream().filter(compra -> (pagina.isFirst() || ORDEN.compare(compra, primero) >= 0)
                && (siguiente == null || ORDEN.compare(compra, siguiente) < 0)).sorted(ORDEN).toList();
    }

    public static List<TransaccionResponse> listar(TransaccionRepository repository, Long uid, TransaccionFiltroRequest filtro) {
        return repository.findAll(TransaccionSpecification.conFiltros(uid,filtro,true)).stream()
                .filter(t -> t.getFechaCreacion()!=null)
                .map(t -> TransaccionResponse.compraAnterior(t,total(repository.findAllByPlantillaRecurrenteIdOrderByFechaAsc(t.getPlantillaRecurrente().getId()))))
                .sorted(java.util.Comparator.comparing(TransaccionResponse::fecha).reversed().thenComparing(TransaccionResponse::id,java.util.Comparator.reverseOrder()))
                .toList();
    }
}
