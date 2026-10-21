package com.gestionfinanzas.ai;

import com.gestionfinanzas.model.enums.TipoTransaccion;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Server-calculated evidence; filters always refer to the authenticated user's records. */
public record AiEvidence(String label, LocalDate desde, LocalDate hasta, String moneda,
                         TipoTransaccion tipo, long operaciones, BigDecimal total) {}
