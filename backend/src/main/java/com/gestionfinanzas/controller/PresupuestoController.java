package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.request.PresupuestoRequest;
import com.gestionfinanzas.dto.response.*;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.PresupuestoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/presupuestos")
@RequiredArgsConstructor
public class PresupuestoController {

    private final PresupuestoService presupuestoService;

    @PostMapping
    public ResponseEntity<ApiResponse<PresupuestoResponse>> guardarPresupuesto(
            @Valid @RequestBody PresupuestoRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        PresupuestoResponse response = presupuestoService.crearOActualizarPresupuesto(userDetails.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Presupuesto guardado exitosamente", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PresupuestoResumenResponse>> obtenerPresupuestos(
            @RequestParam(required = false) Long listaId,
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) Integer anio,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        PresupuestoResumenResponse resumen = presupuestoService.obtenerResumenPeriodo(userDetails.getId(), listaId, mes, anio);
        return ResponseEntity.ok(ApiResponse.ok("Presupuestos obtenidos correctamente", resumen));
    }

    @GetMapping("/{id}/detalle")
    public ResponseEntity<ApiResponse<PresupuestoDetalleResponse>> obtenerDetalle(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        PresupuestoDetalleResponse detalle = presupuestoService.obtenerDetalle(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Detalle del presupuesto obtenido correctamente", detalle));
    }

    @GetMapping("/disponible")
    public ResponseEntity<ApiResponse<PresupuestoDisponibleResponse>> obtenerDisponible(
            @RequestParam Long categoriaId,
            @RequestParam(required = false) Long listaId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(required = false) String moneda,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        PresupuestoDisponibleResponse disponible = presupuestoService.obtenerDisponibleCategoria(
                userDetails.getId(), categoriaId, listaId, fecha, moneda
        );
        return ResponseEntity.ok(ApiResponse.ok("Disponible obtenido correctamente", disponible));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> eliminarPresupuesto(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        presupuestoService.eliminarPresupuesto(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Presupuesto eliminado exitosamente", null));
    }
}
