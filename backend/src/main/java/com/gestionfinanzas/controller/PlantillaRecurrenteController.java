package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.dto.response.PlantillaRecurrenteResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.PlantillaRecurrenteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recurrencias")
@RequiredArgsConstructor
public class PlantillaRecurrenteController {

    private final PlantillaRecurrenteService plantillaService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PlantillaRecurrenteResponse>>> listar(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Plantillas recurrentes obtenidas correctamente",
                plantillaService.listar(userDetails.getId())));
    }

    @PostMapping("/{id}/registrar")
    public ResponseEntity<ApiResponse<Void>> registrarSiguiente(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        plantillaService.registrarSiguiente(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Movimiento recurrente registrado correctamente", null));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<ApiResponse<PlantillaRecurrenteResponse>> cambiarEstado(
            @PathVariable Long id,
            @RequestParam boolean activa,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Plantilla recurrente actualizada correctamente",
                plantillaService.cambiarEstado(userDetails.getId(), id, activa)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> eliminar(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        plantillaService.eliminar(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Plantilla recurrente eliminada correctamente", null));
    }
}
