package com.gestionfinanzas.ai;

import java.math.BigDecimal;

public record AiCategoriaAgregado(Long categoriaId, String categoriaNombre, String moneda,
                                  BigDecimal monto, long operaciones) {}
