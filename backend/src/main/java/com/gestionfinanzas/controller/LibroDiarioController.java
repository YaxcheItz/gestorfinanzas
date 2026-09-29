package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.dto.response.AsientoContableResponse;
import com.gestionfinanzas.dto.request.BackfillLibroDiarioRequest;
import com.gestionfinanzas.dto.response.BackfillLibroDiarioResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.LibroDiarioService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.LocalDate;

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
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) String tipoEvento,
            @RequestParam(required = false) TipoTransaccion tipoMovimiento,
            @RequestParam(required = false) @Min(1) Long cuentaId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha inicial no puede ser posterior a la fecha final");
        }
        Page<AsientoContableResponse> asientos =
                libroDiarioService.listar(userDetails.getId(), PageRequest.of(page, size), desde, hasta,
                        tipoEvento, tipoMovimiento, cuentaId);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.ok("Asientos contables obtenidos correctamente", asientos));
    }

    @GetMapping("/backfill")
    public ResponseEntity<ApiResponse<BackfillLibroDiarioResponse>> previsualizarBackfill(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(ApiResponse.ok("Resumen del historial disponible",
                        libroDiarioService.previsualizarBackfill(userDetails.getId())));
    }

    @PostMapping("/backfill")
    public ResponseEntity<ApiResponse<BackfillLibroDiarioResponse>> ejecutarBackfill(
            @Valid @RequestBody BackfillLibroDiarioRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(ApiResponse.ok("Lote histórico agregado al libro diario",
                        libroDiarioService.ejecutarBackfill(userDetails.getId())));
    }
}
