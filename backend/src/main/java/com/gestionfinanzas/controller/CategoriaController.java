package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.request.CategoriaRequest;
import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.dto.response.CategoriaResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.CategoriaService;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@RestController
@RequestMapping("/api/categorias")
@RequiredArgsConstructor
public class CategoriaController {

    private final CategoriaService categoriaService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoriaResponse>>> listarCategorias(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<CategoriaResponse> categorias = categoriaService.listarCategorias(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok("Categorías obtenidas correctamente", categorias));
    }

    @GetMapping("/mias")
    public ResponseEntity<ApiResponse<List<CategoriaResponse>>> listarMisCategorias(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Categorías obtenidas correctamente",
                categoriaService.listarTodasDelUsuario(userDetails.getId())
        ));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CategoriaResponse>> crearCategoria(
            @Valid @RequestBody CategoriaRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                "Categoría creada correctamente",
                categoriaService.crearCategoria(userDetails.getId(), request)
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoriaResponse>> actualizarCategoria(
            @PathVariable Long id,
            @Valid @RequestBody CategoriaRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Categoría actualizada correctamente",
                categoriaService.actualizarCategoria(userDetails.getId(), id, request)
        ));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<ApiResponse<Void>> cambiarEstadoCategoria(
            @PathVariable Long id,
            @RequestParam boolean activa,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        categoriaService.cambiarEstadoCategoria(userDetails.getId(), id, activa);
        return ResponseEntity.ok(ApiResponse.ok("Estado de categoría actualizado", null));
    }
}
