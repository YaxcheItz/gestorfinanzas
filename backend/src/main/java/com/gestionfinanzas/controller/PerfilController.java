package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.request.CambiarPasswordRequest;
import com.gestionfinanzas.dto.request.PerfilActualizarRequest;
import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.dto.response.PerfilResponse;
import com.gestionfinanzas.dto.response.RespaldoFinancieroResponse;
import com.gestionfinanzas.dto.response.AuditoriaTransaccionResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.AuditoriaTransaccionService;
import com.gestionfinanzas.service.PerfilService;
import com.gestionfinanzas.service.RespaldoFinancieroService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/perfil")
@RequiredArgsConstructor
@Validated
public class PerfilController {

    private final PerfilService perfilService;
    private final RespaldoFinancieroService respaldoService;
    private final AuditoriaTransaccionService auditoriaService;

    @GetMapping
    public ResponseEntity<ApiResponse<PerfilResponse>> obtener(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Perfil obtenido correctamente", perfilService.obtener(userDetails.getId())));
    }

    @GetMapping(value = "/respaldo", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<RespaldoFinancieroResponse> descargarRespaldo(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"kaptal-respaldo-" + LocalDate.now() + ".json\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(respaldoService.generar(userDetails.getId()));
    }

    @GetMapping("/historial")
    public ResponseEntity<ApiResponse<Page<AuditoriaTransaccionResponse>>> historial(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Page<AuditoriaTransaccionResponse> historial =
                auditoriaService.listar(userDetails.getId(), PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok("Historial obtenido correctamente", historial));
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
