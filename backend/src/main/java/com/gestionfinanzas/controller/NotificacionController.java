package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.repository.UsuarioRepository;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.NotificacionWhatsAppService;
import com.gestionfinanzas.service.RecordatorioNotificacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionWhatsAppService notificacionService;
    private final RecordatorioNotificacionService recordatorioService;
    private final UsuarioRepository usuarioRepository;

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

    /**
     * Prueba segura para cualquier usuario: el destino no se recibe como parametro, se toma
     * del perfil, asi que no se puede usar para mandar mensajes a terceros.
     */
    @PostMapping("/test-mi-whatsapp")
    public ResponseEntity<ApiResponse<String>> testMiWhatsApp(@AuthenticationPrincipal CustomUserDetails userDetails) {
        Usuario usuario = usuarioRepository.findById(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        if (usuario.getTelefono() == null || usuario.getTelefono().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("No tienes un teléfono registrado. Agrégalo en tu perfil e inténtalo de nuevo."));
        }
        String resultado = notificacionService.enviarRecordatorio(
            usuario.getTelefono(),
            "¡Hola " + usuario.getNombre() + "! Este es un recordatorio de prueba. ¡Todo está funcionando correctamente! 🚀"
        );
        if (resultado.startsWith("Mensaje enviado exitosamente")) {
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
