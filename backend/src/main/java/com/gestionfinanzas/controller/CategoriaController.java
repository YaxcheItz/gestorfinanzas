package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.dto.response.CategoriaResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.CategoriaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
