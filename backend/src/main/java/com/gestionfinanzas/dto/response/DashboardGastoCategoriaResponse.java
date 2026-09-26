package com.gestionfinanzas.dto.response;

import java.math.BigDecimal;

public record DashboardGastoCategoriaResponse(
    Long categoriaId,
    String categoriaNombre,
    String categoriaColor,
    BigDecimal monto
) {}
