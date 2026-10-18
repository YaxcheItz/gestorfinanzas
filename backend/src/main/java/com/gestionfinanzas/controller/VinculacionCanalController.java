package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.VinculacionCanalService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController @RequiredArgsConstructor
public class VinculacionCanalController {
    private final VinculacionCanalService servicio;
    public record Aprobacion(@NotNull @Pattern(regexp = "[A-Za-z0-9_-]{43}") String challenge) {}
    public record Codigo(String codigo, int venceEnSegundos) {}

    @PostMapping("/api/canales/vinculacion/aprobar")
    public ResponseEntity<ApiResponse<Codigo>> aprobar(@AuthenticationPrincipal CustomUserDetails usuario,
            @Valid @RequestBody Aprobacion solicitud) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(ApiResponse.ok("Vinculacion autorizada", new Codigo(
                        servicio.aprobar(usuario.getId(), solicitud.challenge()), 300)));
    }
}
