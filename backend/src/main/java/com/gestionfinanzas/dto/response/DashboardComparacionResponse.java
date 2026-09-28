package com.gestionfinanzas.dto.response;

import java.util.List;

public record DashboardComparacionResponse(
        int mes,
        int anio,
        int mesAnterior,
        int anioAnterior,
        List<DashboardComparacionMonedaResponse> porMoneda
) {}
