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
    public static List<TransaccionResponse> listar(TransaccionRepository repository, Long uid, TransaccionFiltroRequest filtro) {
        return repository.findAll(TransaccionSpecification.conFiltros(uid,filtro,true)).stream()
                .filter(t -> t.getFechaCreacion()!=null)
                .map(t -> TransaccionResponse.compraAnterior(t,total(repository.findAllByPlantillaRecurrenteIdOrderByFechaAsc(t.getPlantillaRecurrente().getId()))))
                .sorted(java.util.Comparator.comparing(TransaccionResponse::fecha).reversed().thenComparing(TransaccionResponse::id,java.util.Comparator.reverseOrder()))
                .toList();
    }
}
