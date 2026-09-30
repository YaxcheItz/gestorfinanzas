package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.request.EliminarUsuarioRequest;
import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;

    /**
     * Elimina la cuenta del usuario autenticado junto con todos sus datos.
     * No se puede deshacer: por eso el endpoint exige la contraseña actual.
     */
    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> eliminarMiCuenta(
            @Valid @RequestBody EliminarUsuarioRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        usuarioService.eliminarCuenta(userDetails.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Cuenta eliminada correctamente", null));
    }
}
