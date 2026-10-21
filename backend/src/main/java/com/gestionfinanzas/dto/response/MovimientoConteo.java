package com.gestionfinanzas.dto.response;

import com.gestionfinanzas.model.enums.TipoTransaccion;

public record MovimientoConteo(String moneda, TipoTransaccion tipo, long operaciones) {}
