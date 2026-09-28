package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.dto.response.AsientoContableResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.LibroDiarioService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/libro-diario")
@RequiredArgsConstructor
@Validated
public class LibroDiarioController {

    private final LibroDiarioService libroDiarioService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AsientoContableResponse>>> listar(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Page<AsientoContableResponse> asientos =
                libroDiarioService.listar(userDetails.getId(), PageRequest.of(page, size));
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.ok("Asientos contables obtenidos correctamente", asientos));
    }
}
