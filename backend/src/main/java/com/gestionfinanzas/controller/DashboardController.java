package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.dto.response.DashboardAnaliticaResponse;
import com.gestionfinanzas.dto.response.DashboardResumenResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/resumen")
    public ResponseEntity<ApiResponse<DashboardResumenResponse>> obtenerResumen(
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) Integer anio,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        DashboardResumenResponse resumen = dashboardService.obtenerResumen(userDetails.getId(), mes, anio);
        return ResponseEntity.ok(ApiResponse.ok("Resumen del dashboard obtenido correctamente", resumen));
    }

    @GetMapping("/analitica")
    public ResponseEntity<ApiResponse<DashboardAnaliticaResponse>> obtenerAnalitica(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        DashboardAnaliticaResponse analitica = dashboardService.obtenerAnalitica(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok("Analítica del dashboard obtenida correctamente", analitica));
    }
}
