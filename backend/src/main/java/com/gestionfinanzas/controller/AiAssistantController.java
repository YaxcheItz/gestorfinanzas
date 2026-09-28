package com.gestionfinanzas.controller;

import com.gestionfinanzas.ai.AiAssistantService;
import com.gestionfinanzas.ai.AiAssistantService.AiChatResponse;
import com.gestionfinanzas.ai.AiAssistantService.AiConnectionStatus;
import com.gestionfinanzas.ai.AiAssistantService.AiVerificationResult;
import com.gestionfinanzas.ai.AiActionService;
import com.gestionfinanzas.dto.request.AiChatRequest;
import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
@RestController
@RequestMapping("/api/asistente")
@RequiredArgsConstructor
public class AiAssistantController {
    private final AiAssistantService assistantService;
    private final AiActionService actionService;

    @GetMapping("/estado")
    public ResponseEntity<ApiResponse<AiConnectionStatus>> estado() {
        return ResponseEntity.ok(ApiResponse.ok(
                "Configuración del asistente obtenida correctamente",
                assistantService.status()
        ));
    }

    @PostMapping("/verificar")
    public ResponseEntity<ApiResponse<AiVerificationResult>> verificarConexion() {
        return ResponseEntity.ok(ApiResponse.ok(
                "Conexión con Gemini verificada correctamente",
                assistantService.verifyConnection()
        ));
    }

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatResponse>> chat(
            @Valid @RequestBody AiChatRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Respuesta del asistente generada correctamente",
                assistantService.chat(userDetails.getId(), request)
        ));
    }

    @PostMapping("/acciones/{id}/confirmar")
    public ResponseEntity<ApiResponse<AiActionConfirmation>> confirmAction(
            @PathVariable String id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                actionService.confirm(userDetails.getId(), id),
                new AiActionConfirmation(true)
        ));
    }

    public record AiActionConfirmation(boolean completed) {}
}
