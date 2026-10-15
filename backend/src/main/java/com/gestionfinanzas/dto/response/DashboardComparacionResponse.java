package com.gestionfinanzas.dto.response;

import java.util.List;

public record DashboardComparacionResponse(
        int mes,
        int anio,
        int mesAnterior,
        int anioAnterior,
        List<DashboardComparacionMonedaResponse> porMoneda,
        java.time.LocalDate desde,
        java.time.LocalDate hasta,
        java.time.LocalDate desdeAnterior,
        java.time.LocalDate hastaAnterior
) {}
