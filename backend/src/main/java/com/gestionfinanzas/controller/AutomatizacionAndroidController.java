package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.request.AutomatizacionAndroidRequest.*;
import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.AutomatizacionAndroidService;
import com.gestionfinanzas.service.AvisoFinancieroService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class AutomatizacionAndroidController {
    private final AutomatizacionAndroidService service;

    @ModelAttribute
    public void noCache(jakarta.servlet.http.HttpServletResponse response) {
        response.setHeader("Cache-Control","no-store");
    }

    @PostMapping("/api/automatizacion/android")
    public ApiResponse<AutomatizacionAndroidService.Credencial> configurar(
            @AuthenticationPrincipal CustomUserDetails user, @Valid @RequestBody Configuracion body) {
        return ApiResponse.ok("Dispositivo conectado",service.configurar(user.getId(),body));
    }

    @GetMapping("/api/automatizacion/android/{dispositivo}")
    public ApiResponse<AutomatizacionAndroidService.Estado> estado(
            @AuthenticationPrincipal CustomUserDetails user, @PathVariable UUID dispositivo) {
        return ApiResponse.ok("Estado del dispositivo",service.estado(user.getId(),dispositivo));
    }

    @DeleteMapping("/api/automatizacion/android/{dispositivo}")
    public ApiResponse<Void> desconectar(
            @AuthenticationPrincipal CustomUserDetails user, @PathVariable UUID dispositivo) {
        service.desconectar(user.getId(),dispositivo);
        return ApiResponse.ok("Dispositivo desconectado",null);
    }

    @PostMapping("/api/canales/android/evento")
    public ApiResponse<AvisoFinancieroService.Vista> recibir(
            @RequestHeader(value="X-Kaptal-Android",required=false) String clave,
            @Valid @RequestBody Evento body) {
        return ApiResponse.ok("Aviso procesado",service.recibir(clave,body));
    }
}
