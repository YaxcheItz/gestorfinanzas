package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.EtiquetaPersonalService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/etiquetas") @RequiredArgsConstructor
public class EtiquetaPersonalController {
    private final EtiquetaPersonalService servicio;
    public record Etiqueta(Long id, String nombre) {}
    public record Nueva(@NotBlank @Size(max=32) String nombre) {}
    @GetMapping public ApiResponse<List<Etiqueta>> listar(@AuthenticationPrincipal CustomUserDetails u) {
        return ApiResponse.ok("Etiquetas", servicio.listar(u.getId()).stream().map(e -> new Etiqueta(e.getId(),e.getNombre())).toList());
    }
    @PostMapping public ApiResponse<Etiqueta> crear(@AuthenticationPrincipal CustomUserDetails u, @Valid @RequestBody Nueva r) {
        var e=servicio.crear(u.getId(),r.nombre()); return ApiResponse.ok("Etiqueta creada",new Etiqueta(e.getId(),e.getNombre()));
    }
    @DeleteMapping("/{id}") public ApiResponse<Void> eliminar(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id) {
        servicio.eliminar(u.getId(),id); return ApiResponse.ok("Etiqueta eliminada",null);
    }
}
