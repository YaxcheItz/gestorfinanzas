package com.gestionfinanzas.dto.response;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;

public class HistorialTransaccionesResponse extends PageImpl<TransaccionResponse> {
    private final List<TransaccionResponse> comprasMsiAnteriores;
    public HistorialTransaccionesResponse(Page<TransaccionResponse> page,List<TransaccionResponse> compras) {
        super(page.getContent(),page.getPageable(),page.getTotalElements());
        this.comprasMsiAnteriores=compras;
    }
    public List<TransaccionResponse> getComprasMsiAnteriores() { return comprasMsiAnteriores; }
}
