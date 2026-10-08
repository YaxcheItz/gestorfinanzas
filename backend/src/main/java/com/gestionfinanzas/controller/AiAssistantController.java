package com.gestionfinanzas.controller;

import com.gestionfinanzas.ai.AiAssistantService;
import com.gestionfinanzas.ai.AiAssistantService.AiChatResponse;
import com.gestionfinanzas.ai.AiAssistantService.AiConnectionStatus;
import com.gestionfinanzas.ai.AiAssistantService.AiVerificationResult;
import com.gestionfinanzas.ai.AiActionService;
import com.gestionfinanzas.ai.AudioTranscriptionService;
import com.gestionfinanzas.dto.request.AiChatRequest;
import com.gestionfinanzas.dto.request.AiQuickCaptureRequest;
import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
@RestController
@RequestMapping("/api/asistente")
@RequiredArgsConstructor
public class AiAssistantController {
    private final AiAssistantService assistantService;
    private final AiActionService actionService;
    private final AudioTranscriptionService transcriptionService;

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

    @PostMapping("/captura-rapida")
    public ResponseEntity<ApiResponse<AiChatResponse>> capturaRapida(
            @Valid @RequestBody AiQuickCaptureRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Captura analizada",
                assistantService.quickCapture(userDetails.getId(), request)
        ));
    }

    @PostMapping(value = "/voz/transcribir", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<String>> transcribirVoz(@RequestPart("audio") MultipartFile audio) {
        if (audio == null || audio.isEmpty()) {
            throw new IllegalArgumentException("No recibí audio para transcribir.");
        }
        if (audio.getSize() > 5L * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "La grabación supera el máximo de 5 MB.");
        }
        try {
            return ResponseEntity.ok(ApiResponse.ok(
                    "Audio transcrito",
                    transcriptionService.transcribir(audio.getBytes(), audio.getContentType())
            ));
        } catch (java.io.IOException exception) {
            throw new IllegalArgumentException("No pude leer la grabación. Inténtalo de nuevo.");
        }
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
