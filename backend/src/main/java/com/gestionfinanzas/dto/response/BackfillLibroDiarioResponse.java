package com.gestionfinanzas.dto.response;

import java.util.Map;

public record BackfillLibroDiarioResponse(
        int movimientosEncontrados,
        int yaContabilizados,
        int pendientes,
        int omitidos,
        int procesados,
        int pendientesDespues,
        Map<String, ConciliacionMonedaResponse> conciliacion,
        java.util.List<ConciliacionCuentaResponse> conciliacionCuentas,
        Map<String, Integer> motivosOmitidos
) {}
