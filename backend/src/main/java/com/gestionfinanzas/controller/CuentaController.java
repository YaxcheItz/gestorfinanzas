package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.request.CuentaRequest;
import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.dto.response.CuentaResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.CuentaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cuentas")
@RequiredArgsConstructor
public class CuentaController {

    private final CuentaService cuentaService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CuentaResponse>>> listarCuentas(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<CuentaResponse> cuentas = cuentaService.listarCuentas(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok("Cuentas obtenidas correctamente", cuentas));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CuentaResponse>> obtenerCuenta(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        CuentaResponse cuenta = cuentaService.obtenerCuenta(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Cuenta obtenida correctamente", cuenta));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CuentaResponse>> crearCuenta(
            @Valid @RequestBody CuentaRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        CuentaResponse cuenta = cuentaService.crearCuenta(userDetails.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Cuenta creada exitosamente", cuenta));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CuentaResponse>> actualizarCuenta(
            @PathVariable Long id,
            @Valid @RequestBody CuentaRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        CuentaResponse cuenta = cuentaService.actualizarCuenta(userDetails.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.ok("Cuenta actualizada correctamente", cuenta));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> desactivarCuenta(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        cuentaService.desactivarCuenta(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Cuenta desactivada correctamente", null));
    }
}
