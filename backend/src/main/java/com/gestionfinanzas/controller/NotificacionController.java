package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.service.NotificacionWhatsAppService;
import com.gestionfinanzas.service.RecordatorioNotificacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionWhatsAppService notificacionService;
    private final RecordatorioNotificacionService recordatorioService;

    @PostMapping("/test-whatsapp")
    public ResponseEntity<ApiResponse<String>> testWhatsApp(@RequestParam String telefono) {
        String resultado = notificacionService.enviarRecordatorio(
            telefono,
            "¡Hola! Este es un recordatorio de prueba desde tu Gestor de Finanzas. ¡Todo está funcionando correctamente! 🚀"
        );
        boolean exito = resultado.startsWith("Mensaje enviado exitosamente");
        if (exito) {
            return ResponseEntity.ok(ApiResponse.ok(resultado, null));
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error(resultado));
        }
    }

    @PostMapping("/ejecutar-recordatorios")
    public ResponseEntity<ApiResponse<String>> ejecutarRecordatorios() {
        int total = recordatorioService.ejecutarRecordatoriosDiarios();
        return ResponseEntity.ok(ApiResponse.ok("Recordatorios ejecutados correctamente. Notificaciones enviadas: " + total, null));
    }
}
