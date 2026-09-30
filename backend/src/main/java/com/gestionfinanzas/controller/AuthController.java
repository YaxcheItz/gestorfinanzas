package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.request.LoginRequest;
import com.gestionfinanzas.dto.request.RestablecerPasswordRequest;
import com.gestionfinanzas.dto.request.RegistroRequest;
import com.gestionfinanzas.dto.request.SolicitudRecuperacionRequest;
import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.dto.response.AuthResponse;
import com.gestionfinanzas.service.AuthService;
import com.gestionfinanzas.service.RecuperacionCuentaService;
import com.gestionfinanzas.service.SesionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RecuperacionCuentaService recuperacionCuentaService;
    private final SesionService sesionService;

    @Value("${jwt.refresh.cookie-name:finanzas_refresh}")
    private String cookieName;

    @Value("${jwt.refresh.expiration-ms:2592000000}")
    private long refreshExpirationMs;

    @Value("${jwt.refresh.same-site:Lax}")
    private String sameSite;

    @Value("${jwt.refresh.secure:true}")
    private boolean secure;

    @PostMapping("/registro")
    public ResponseEntity<ApiResponse<AuthResponse>> registrar(@Valid @RequestBody RegistroRequest request) {
        SesionService.SesionEmitida sesion = authService.registrar(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, cookieRefresh(sesion.refreshToken()).toString())
                .body(ApiResponse.ok("Usuario registrado exitosamente", sesion.auth()));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        SesionService.SesionEmitida sesion = authService.login(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookieRefresh(sesion.refreshToken()).toString())
                .body(ApiResponse.ok("Inicio de sesión exitoso", sesion.auth()));
    }

    /**
     * Renueva la sesion. Va sin cabecera Authorization a proposito: la cookie httpOnly es la
     * credencial, y el JavaScript de la pagina no tiene por que poder leerla ni reenviarla.
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refrescar(
            @CookieValue(name = "${jwt.refresh.cookie-name:finanzas_refresh}", required = false)
            String refreshToken) {
        SesionService.SesionEmitida sesion = sesionService.refrescar(refreshToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookieRefresh(sesion.refreshToken()).toString())
                .body(ApiResponse.ok("Sesión renovada", sesion.auth()));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @CookieValue(name = "${jwt.refresh.cookie-name:finanzas_refresh}", required = false)
            String refreshToken) {
        sesionService.revocar(refreshToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookieBorrado().toString())
                .body(ApiResponse.ok("Sesión cerrada", null));
    }

    private ResponseCookie cookieRefresh(String valor) {
        return cookie(valor, Duration.ofMillis(refreshExpirationMs));
    }

    private ResponseCookie cookieBorrado() {
        return cookie("", Duration.ZERO);
    }

    private ResponseCookie cookie(String valor, Duration maxAge) {
        return ResponseCookie.from(cookieName, valor)
                .httpOnly(true)
                .secure(secure)
                .path("/api/auth")
                .sameSite(sameSite)
                .maxAge(maxAge)
                .build();
    }
}
