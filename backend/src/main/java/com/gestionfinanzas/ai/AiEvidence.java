package com.gestionfinanzas.ai;

import com.gestionfinanzas.model.enums.TipoTransaccion;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Server-calculated evidence; list-scoped links additionally constrain the author when needed. */
public record AiEvidence(String label, LocalDate desde, LocalDate hasta, String moneda,
                         TipoTransaccion tipo, long operaciones, BigDecimal total, Long cuentaId,
                         Long categoriaId, String cuentaNombre, String categoriaNombre, boolean sinCategoria,
                         Long listaId, String listaNombre, Long autorId) {
    public AiEvidence(String label, LocalDate desde, LocalDate hasta, String moneda,
                      TipoTransaccion tipo, long operaciones, BigDecimal total, Long cuentaId,
                      Long categoriaId, String cuentaNombre, String categoriaNombre) {
        this(label,desde,hasta,moneda,tipo,operaciones,total,cuentaId,categoriaId,cuentaNombre,categoriaNombre,false,null,null,null);
    }

    public AiEvidence(String label, LocalDate desde, LocalDate hasta, String moneda,
                      TipoTransaccion tipo, long operaciones, BigDecimal total, Long cuentaId,
                      Long categoriaId, String cuentaNombre, String categoriaNombre, boolean sinCategoria) {
        this(label,desde,hasta,moneda,tipo,operaciones,total,cuentaId,categoriaId,cuentaNombre,categoriaNombre,sinCategoria,null,null,null);
    }

    public AiEvidence(String label, LocalDate desde, LocalDate hasta, String moneda,
                      TipoTransaccion tipo, long operaciones, BigDecimal total) {
        this(label,desde,hasta,moneda,tipo,operaciones,total,null,null,null,null,false,null,null,null);
    }
}
