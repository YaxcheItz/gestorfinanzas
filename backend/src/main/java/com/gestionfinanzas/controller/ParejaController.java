package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.request.AportacionParejaRequest;
import com.gestionfinanzas.dto.request.GastoParejaRequest;
import com.gestionfinanzas.dto.request.PagoParejaRequest;
import com.gestionfinanzas.dto.request.ParejaCrearRequest;
import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.dto.response.ParejaResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.ParejaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pareja")
@RequiredArgsConstructor
public class ParejaController {

    private final ParejaService parejaService;

    /**
     * Devuelve `null` en `data` cuando todavía no hay pareja vinculada, para que
     * la pantalla pueda mostrar el formulario de invite sin tener que adivinarlo
     * por un error. Es un caso normal, no una falla.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<ParejaResponse>> obtener(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Pareja obtenida correctamente", parejaService.obtener(userDetails.getId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ParejaResponse>> crear(
            @Valid @RequestBody ParejaCrearRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        ParejaResponse pareja = parejaService.crear(userDetails.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Pareja vinculada correctamente", pareja));
    }

    @PostMapping("/aportes")
    public ResponseEntity<ApiResponse<ParejaResponse>> agregarAporte(
            @Valid @RequestBody AportacionParejaRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Aporte registrado correctamente", parejaService.agregarAporte(userDetails.getId(), request)));
    }

    @DeleteMapping("/aportes/{aporteId}")
    public ResponseEntity<ApiResponse<ParejaResponse>> eliminarAporte(
            @PathVariable Long aporteId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Aporte eliminado correctamente",
                parejaService.eliminarAporte(userDetails.getId(), aporteId)));
    }

    @PostMapping("/gastos")
    public ResponseEntity<ApiResponse<ParejaResponse>> agregarGasto(
            @Valid @RequestBody GastoParejaRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Gasto compartido registrado correctamente",
                        parejaService.agregarGasto(userDetails.getId(), request)));
    }

    @DeleteMapping("/gastos/{gastoId}")
    public ResponseEntity<ApiResponse<ParejaResponse>> eliminarGasto(
            @PathVariable Long gastoId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Gasto eliminado correctamente",
                parejaService.eliminarGasto(userDetails.getId(), gastoId)));
    }

    @PostMapping("/pagos")
    public ResponseEntity<ApiResponse<ParejaResponse>> registrarPago(
            @Valid @RequestBody PagoParejaRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Pago registrado correctamente", parejaService.registrarPago(userDetails.getId(), request)));
    }

    @DeleteMapping("/pagos/{pagoId}")
    public ResponseEntity<ApiResponse<ParejaResponse>> eliminarPago(
            @PathVariable Long pagoId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Pago eliminado correctamente",
                parejaService.eliminarPago(userDetails.getId(), pagoId)));
    }

    @DeleteMapping("/{parejaId}")
    public ResponseEntity<ApiResponse<Void>> desvincular(
            @PathVariable Long parejaId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        parejaService.desvincular(userDetails.getId(), parejaId);
        return ResponseEntity.ok(ApiResponse.ok("Pareja desvinculada correctamente", null));
    }
}
