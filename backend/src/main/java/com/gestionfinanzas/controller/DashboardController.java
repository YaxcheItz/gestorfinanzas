package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.dto.response.DashboardAnaliticaResponse;
import com.gestionfinanzas.dto.response.DashboardComparacionResponse;
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
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/periodo")
    public ResponseEntity<ApiResponse<com.gestionfinanzas.service.PeriodoFinanciero.Rango>> resolverPeriodo(
            @RequestParam(defaultValue = "MES") String tipo,
            @RequestParam(defaultValue = "2026-01-05") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ancla,
            @RequestParam(defaultValue = "1") int diaInicio,
            @RequestParam(defaultValue = "16") int diaQuincena,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referencia) {
        var config = new com.gestionfinanzas.service.PeriodoFinanciero.Config(tipo, ancla, diaInicio, diaQuincena);
        return ResponseEntity.ok(ApiResponse.ok("Periodo resuelto",
                com.gestionfinanzas.service.PeriodoFinanciero.resolver(config,
                        referencia == null ? com.gestionfinanzas.service.CalendarioFinanciero.hoy() : referencia)));
    }

    @GetMapping("/resumen")
    public ResponseEntity<ApiResponse<DashboardResumenResponse>> obtenerResumen(
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        DashboardResumenResponse resumen = dashboardService.obtenerResumen(userDetails.getId(), mes, anio, desde, hasta);
        return ResponseEntity.ok(ApiResponse.ok("Resumen del dashboard obtenido correctamente", resumen));
    }

    @GetMapping("/analitica")
    public ResponseEntity<ApiResponse<DashboardAnaliticaResponse>> obtenerAnalitica(
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        DashboardAnaliticaResponse analitica = dashboardService.obtenerAnalitica(userDetails.getId(), mes, anio, desde, hasta);
        return ResponseEntity.ok(ApiResponse.ok("Analítica del dashboard obtenida correctamente", analitica));
    }

    @GetMapping("/comparacion")
    public ResponseEntity<ApiResponse<DashboardComparacionResponse>> obtenerComparacion(
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desdeAnterior,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hastaAnterior,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        DashboardComparacionResponse comparacion =
                dashboardService.obtenerComparacion(userDetails.getId(), mes, anio, desde, hasta, desdeAnterior, hastaAnterior);
        return ResponseEntity.ok(ApiResponse.ok("Comparación de periodos obtenida correctamente", comparacion));
    }
}
