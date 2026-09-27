package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.request.CambiarPasswordRequest;
import com.gestionfinanzas.dto.request.PerfilActualizarRequest;
import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.dto.response.PerfilResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.PerfilService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/perfil")
@RequiredArgsConstructor
public class PerfilController {

    private final PerfilService perfilService;

    @GetMapping
    public ResponseEntity<ApiResponse<PerfilResponse>> obtener(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Perfil obtenido correctamente", perfilService.obtener(userDetails.getId())));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<PerfilResponse>> actualizar(
            @Valid @RequestBody PerfilActualizarRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Perfil actualizado correctamente",
                perfilService.actualizar(userDetails.getId(), request)));
    }

    @PutMapping("/password")
    public ResponseEntity<ApiResponse<Void>> cambiarPassword(
            @Valid @RequestBody CambiarPasswordRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        perfilService.cambiarPassword(userDetails.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Contraseña actualizada correctamente", null));
    }
}
