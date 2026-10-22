package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.request.CuentaRequest;
import com.gestionfinanzas.dto.response.*;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.CuentaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController @RequestMapping("/api/metas") @RequiredArgsConstructor
public class MetaController {
    private final CuentaService servicio;
    private final CuentaRepository cuentas;
    public record Crear(@NotBlank @Size(min=2,max=100) String nombre,
            @NotNull @DecimalMin("0.01") @Digits(integer=13,fraction=2) BigDecimal objetivo,
            @NotNull @Pattern(regexp="MXN|USD|CAD|EUR|GBP") String moneda) {}
    public record Estado(@NotNull Boolean cancelada) {}

    @PostMapping @Transactional
    public ApiResponse<CuentaResponse> crear(@AuthenticationPrincipal CustomUserDetails u, @Valid @RequestBody Crear r) {
        var nueva=servicio.crearCuenta(u.getId(),new CuentaRequest(r.nombre(),TipoCuenta.AHORRO,
                null,null,null,null,null,null,BigDecimal.ZERO,r.moneda(),"Apartado propio para meta de ahorro"));
        var cuenta=cuentas.findByIdAndUsuarioId(nueva.id(),u.getId()).orElseThrow();
        cuenta.setMetaObjetivo(r.objetivo());
        return ApiResponse.ok("Meta creada",CuentaResponse.fromEntity(cuenta));
    }

    @PatchMapping("/{id}/estado") @Transactional
    public ApiResponse<CuentaResponse> estado(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id, @Valid @RequestBody Estado r) {
        var cuenta=cuentas.findByIdAndUsuarioId(id,u.getId()).orElseThrow(()->new IllegalArgumentException("Meta no disponible."));
        if(cuenta.getMetaObjetivo()==null) throw new IllegalArgumentException("Esta cuenta no es una meta.");
        cuenta.setMetaCancelada(r.cancelada());
        return ApiResponse.ok("Meta actualizada",CuentaResponse.fromEntity(cuenta));
    }
}
