package com.gestionfinanzas.dto.response;

import java.util.List;

public record DashboardAnaliticaResponse(
    List<DashboardGastoCategoriaResponse> gastosPorCategoria,
    List<DashboardMesResponse> ultimosSeisMeses
) {}
