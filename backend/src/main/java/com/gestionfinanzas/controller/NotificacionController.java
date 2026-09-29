package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.service.NotificacionWhatsAppService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionWhatsAppService notificacionService;

    @PostMapping("/test-whatsapp")
    public ResponseEntity<ApiResponse<String>> testWhatsApp(@RequestParam String telefono) {
        notificacionService.enviarRecordatorio(telefono, "Hola! Este es un recordatorio de prueba desde tu Gestor de Finanzas. Todo est funcionando correctamente! \uD83D\uDE80");
        return ResponseEntity.ok(ApiResponse.ok("Mensaje de prueba enviado. Revisa tu WhatsApp (recuerda unirte al Sandbox primero).", null));
    }
}
